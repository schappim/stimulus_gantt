module StimulusGanttRails
  Field = Struct.new(:name, :type, :editable, :concurrency, :validate, :values, keyword_init: true) do
    SUPPORTED_TYPES = %i[string integer float boolean date datetime duration array enum].freeze

    def initialize(*)
      super
      raise ArgumentError, "Unknown field type: #{type.inspect}" unless SUPPORTED_TYPES.include?(type)
    end

    def editable_for?(task, user)
      case editable
      when true, false then editable
      when Proc        then !!editable.call(task, user)
      when nil         then false
      else                  !!editable
      end
    end

    def version_checked?
      concurrency == :version_checked
    end

    def validate!(value, task)
      return nil unless validate

      result = validate.call(value, task)
      raise StimulusGanttRails::Veto, result if result.is_a?(String)
    end

    def coerce(value)
      return value if value.nil?

      case type
      when :string   then value.to_s
      when :integer  then Integer(value)
      when :float    then Float(value)
      when :boolean  then ActiveModel::Type::Boolean.new.cast(value)
      when :date     then value.is_a?(Date) ? value : Date.parse(value.to_s)
      when :datetime then value.is_a?(Time) ? value : Time.zone.parse(value.to_s)
      when :duration then value.to_s
      when :array    then Array(value)
      when :enum     then value.to_sym if values&.map(&:to_sym)&.include?(value.to_sym)
      end
    end
  end
end
