module StimulusGanttRails
  class DependenciesController < ApplicationController
    def create
      gantt = gantt_for(params[:resource])
      model = gantt.class._model.reflect_on_association(:dependencies)&.klass
      raise 'No dependency association declared on Gantt model' unless model

      dep = model.create!(dependency_params)
      render json: { dependency: serialize(dep) }
    end

    def destroy
      gantt = gantt_for(params[:resource])
      model = gantt.class._model.reflect_on_association(:dependencies)&.klass
      dep = model.find(params[:id])
      dep.destroy!
      render json: { ok: true, dependencyId: params[:id] }
    end

    private

    def dependency_params
      params.require(:dependency).permit(:from, :to, :type, :lag)
    end

    def serialize(dep)
      {
        id: dep.id.to_s,
        from: dep.from.to_s,
        to: dep.to.to_s,
        type: dep.try(:type) || 'FS',
        lag: dep.try(:lag),
      }
    end
  end
end
