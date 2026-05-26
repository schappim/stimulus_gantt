require 'turbo-rails'

module StimulusGanttRails
  # Custom Turbo Stream actions. Registered with Turbo's renderer so
  # they appear as `<turbo-stream action="gantt-task-add">` etc. The
  # JS-side turbo_stream adapter listens for these actions and pumps
  # the payload into the broadcast bus.
  module TurboStreamsHelper
    ACTIONS = %w[gantt-task-add gantt-task-update gantt-task-remove
                 gantt-dependency-add gantt-dependency-remove
                 gantt-bulk gantt-conflict].freeze

    def self.install!
      Turbo::Streams::TagBuilder.class_eval do
        ACTIONS.each do |action|
          method_name = action.gsub('-', '_').to_sym
          define_method(method_name) do |payload|
            action_all(action, target: nil) { payload.to_json.html_safe }
          end
        end
      end
    rescue NameError
      # turbo-rails not loaded yet at boot — handled inside the engine
      # initializer.
    end
  end
end

StimulusGanttRails::TurboStreamsHelper.install!
