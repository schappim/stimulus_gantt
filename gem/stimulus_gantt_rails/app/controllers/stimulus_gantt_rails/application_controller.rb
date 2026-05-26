module StimulusGanttRails
  class ApplicationController < ::StimulusGanttRails.parent_controller.constantize
    helper_method :gantt_for, :current_gantt_user

    private

    def gantt_for(resource)
      klass = StimulusGanttRails.lookup_gantt(resource)
      klass.new(user: current_gantt_user)
    end

    def current_gantt_user
      respond_to?(:current_user, true) ? current_user : nil
    end
  end
end
