module StimulusGanttRails
  # Base class for declarative Gantt definitions.
  class Gantt
    class << self
      attr_accessor :_resource, :_model
      attr_reader :_fields, :_dependency_types, :_calendars, :_before_update_callbacks

      def resource(name)
        @_resource = name.to_s
        StimulusGanttRails.register_gantt(@_resource, self)
      end

      def model(klass)
        @_model = klass
      end

      def field(name, type:, editable: false, concurrency: nil, validate: nil, values: nil)
        @_fields ||= {}
        @_fields[name.to_sym] = Field.new(
          name: name.to_sym, type: type, editable: editable,
          concurrency: concurrency, validate: validate, values: values,
        )
      end

      def dependency_types(types = nil)
        @_dependency_types = types if types
        @_dependency_types ||= %i[FS SS FF SF]
      end

      def calendar(id, &block)
        @_calendars ||= {}
        cal = Calendar.new(id)
        cal.instance_eval(&block) if block
        @_calendars[id.to_s] = cal
      end

      def before_update(callable = nil, &block)
        @_before_update_callbacks ||= []
        @_before_update_callbacks << (callable || block)
      end

      def inherited(subclass)
        super
        subclass.instance_variable_set(:@_fields, (_fields || {}).dup)
        subclass.instance_variable_set(:@_dependency_types, (_dependency_types || %i[FS SS FF SF]).dup)
        subclass.instance_variable_set(:@_calendars, (_calendars || {}).dup)
        subclass.instance_variable_set(:@_before_update_callbacks, (_before_update_callbacks || []).dup)
      end
    end

    attr_reader :user, :options

    def initialize(user: nil, **options)
      @user = user
      @options = options
    end

    def fields
      self.class._fields || {}
    end

    def field(name)
      fields[name.to_sym]
    end

    def editable?(field_name, task)
      f = field(field_name)
      return false unless f

      f.editable_for?(task, user)
    end

    def run_before_update!(task, change:)
      (self.class._before_update_callbacks || []).each do |cb|
        cb.call(task, change: change, user: user)
      end
    end

    def calendars_as_json
      (self.class._calendars || {}).transform_values(&:as_json)
    end

    def to_locals(tasks: [], dependencies: [], resources: [], baselines: [], **rest)
      {
        gantt: self,
        tasks: tasks,
        dependencies: dependencies,
        resources: resources,
        baselines: baselines,
        calendars: calendars_as_json,
        dependency_types: self.class.dependency_types,
        **rest,
      }
    end
  end
end
