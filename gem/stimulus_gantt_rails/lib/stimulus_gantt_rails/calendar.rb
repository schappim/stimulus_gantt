module StimulusGanttRails
  class Calendar
    attr_accessor :id, :weekdays_list, :hours_list, :holidays_list

    def initialize(id)
      @id = id
      @weekdays_list = [1, 2, 3, 4, 5]
      @hours_list    = [['09:00', '17:00']]
      @holidays_list = []
    end

    def weekdays(*args)
      args.empty? ? @weekdays_list : (@weekdays_list = Array(args.first))
    end

    def hours(*args)
      args.empty? ? @hours_list : (@hours_list = args.first.is_a?(Array) ? args.first.map(&:to_a) : Array(args))
    end

    def holidays(*args)
      return @holidays_list if args.empty?

      @holidays_list = args.flatten.compact.map { |d| d.is_a?(Date) ? d.iso8601 : d.to_s }
    end

    def as_json
      {
        id: id.to_s,
        weekdays: weekdays_list,
        hours: hours_list,
        holidays: holidays_list,
      }
    end
  end
end
