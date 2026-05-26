module StimulusGanttRails
  class ResourcesController < ApplicationController
    def index
      gantt = gantt_for(params[:resource])
      resources = if gantt.class.respond_to?(:resources_proc) && gantt.class.resources_proc
                    gantt.class.resources_proc.call(current_gantt_user)
                  else
                    []
                  end
      render json: { resources: resources }
    end
  end
end
