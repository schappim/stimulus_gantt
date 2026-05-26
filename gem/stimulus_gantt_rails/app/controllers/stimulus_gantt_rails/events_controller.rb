module StimulusGanttRails
  class EventsController < ApplicationController
    before_action :resolve_gantt
    before_action :resolve_record, only: %i[update destroy]

    # GET /:resource/events?after=cursor&limit=200
    def index
      scope = @gantt.class._model.all
      scope = scope.where('id > ?', params[:after]) if params[:after].present?
      scope = scope.limit(params[:limit].to_i.nonzero? || 200)
      render json: { tasks: scope.map { |r| serialize(r) } }
    end

    def create
      record = @gantt.class._model.new(record_params)
      validate_change!(record, change_from_params)
      record.save!
      respond_with_action(record, op: :add)
    end

    def update
      change = change_from_params
      validate_change!(@record, change)
      assign_change(@record, change)
      @record.save!
      respond_with_action(@record, op: :update)
    rescue ActiveRecord::StaleObjectError
      render json: { conflict: true, taskId: @record.id.to_s, reason: 'lock_version mismatch' }, status: :conflict
    end

    def destroy
      @record.destroy!
      render json: { ok: true, taskId: @record.id.to_s }
    end

    def destroy_bulk
      ids = Array(params[:ids]).map(&:to_s)
      @gantt.class._model.where(id: ids).destroy_all
      render json: { ok: true, taskIds: ids }
    end

    def bulk
      tx = params.require(:transaction).permit!.to_h.deep_symbolize_keys
      results = ApplicationRecord.transaction do
        adds = Array(tx[:add]&.dig(:tasks)).map { |attrs| @gantt.class._model.create!(attrs) }
        updates = Array(tx[:update]&.dig(:tasks)).map do |attrs|
          rec = @gantt.class._model.find(attrs[:id])
          rec.update!(attrs)
          rec
        end
        removes = Array(tx[:remove]&.dig(:taskIds))
        @gantt.class._model.where(id: removes).destroy_all
        { adds: adds, updates: updates, removed: removes }
      end
      render json: { ok: true, applied: results.transform_values { |v| v.is_a?(Array) ? v.map { |r| r.respond_to?(:id) ? r.id : r } : v } }
    end

    private

    def resolve_gantt
      @gantt = gantt_for(params[:resource])
    end

    def resolve_record
      @record = @gantt.class._model.find(params[:id])
    end

    def record_params
      params.require(:task).permit(@gantt.fields.keys)
    end

    def change_from_params
      record_params.to_h.symbolize_keys
    end

    def validate_change!(record, change)
      @gantt.run_before_update!(record, change: change)
      change.each do |k, v|
        f = @gantt.field(k)
        next unless f

        f.validate!(v, record)
      end
    end

    def assign_change(record, change)
      change.each do |k, v|
        f = @gantt.field(k) or next
        record.public_send("#{k}=", f.coerce(v)) if record.respond_to?("#{k}=")
      end
    end

    def serialize(record)
      Broadcastable.wire_payload(:update, record)[:task]
    end

    def respond_with_action(record, op:)
      render json: { task: serialize(record) }
    end
  end
end
