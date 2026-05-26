module StimulusGanttRails
  module Broadcastable
    extend ActiveSupport::Concern

    class_methods do
      # broadcasts_gantt ProjectGantt, stream: ->(t) { "project:#{t.project_id}" }
      #
      # Defaults to broadcasting on :create / :update / :destroy.
      def broadcasts_gantt(gantt_klass, stream:, on: %i[create update destroy])
        Array(on).each do |action|
          send("after_commit_#{action}_callback_for_stimulus_gantt", gantt_klass, stream)
        end
      end

      def after_commit_create_callback_for_stimulus_gantt(gantt_klass, stream)
        after_create_commit do
          StimulusGanttRails::Broadcastable.broadcast(:add, self, gantt_klass: gantt_klass, stream_proc: stream)
        end
      end

      def after_commit_update_callback_for_stimulus_gantt(gantt_klass, stream)
        after_update_commit do
          StimulusGanttRails::Broadcastable.broadcast(:update, self, gantt_klass: gantt_klass, stream_proc: stream)
        end
      end

      def after_commit_destroy_callback_for_stimulus_gantt(gantt_klass, stream)
        after_destroy_commit do
          StimulusGanttRails::Broadcastable.broadcast(:remove, self, gantt_klass: gantt_klass, stream_proc: stream)
        end
      end
    end

    # Render the matching Turbo Stream action against the resolved stream.
    def self.broadcast(op, record, gantt_klass:, stream_proc:)
      stream_name = stream_proc.respond_to?(:call) ? stream_proc.call(record) : stream_proc.to_s
      payload = wire_payload(op, record)
      action  = "gantt-task-#{op}"
      Turbo::StreamsChannel.broadcast_action_to(
        *StimulusGanttRails.streamables_for(stream_name),
        action: action,
        target: 'gantt',
        renderable: lambda { |stream|
          stream.action_all(action) { payload.to_json.html_safe }
        },
      )
    end

    def self.wire_payload(op, record)
      attrs = if record.respond_to?(:as_gantt_payload)
                record.as_gantt_payload
              else
                {
                  id: record.id.to_s,
                  name: record.try(:name),
                  start: record.try(:start)&.iso8601,
                  end: record.try(:end)&.iso8601,
                  progress: record.try(:progress),
                  milestone: record.try(:milestone),
                  summary: record.try(:summary),
                  parentId: record.try(:parent_id)&.to_s,
                }
              end
      case op
      when :remove then { taskId: record.id.to_s }
      else              { task: attrs }
      end
    end
  end
end
