require 'rails/engine'

module StimulusGanttRails
  class Engine < ::Rails::Engine
    isolate_namespace StimulusGanttRails

    initializer 'stimulus_gantt_rails.importmap', before: 'importmap' do |app|
      next unless app.config.respond_to?(:importmap)

      app.config.importmap.paths << Engine.root.join('config/importmap.rb')
      app.config.importmap.cache_sweepers << Engine.root.join('app/assets/javascripts')
    end

    initializer 'stimulus_gantt_rails.assets' do |app|
      app.config.assets.paths << Engine.root.join('app/assets/javascripts').to_s if app.config.respond_to?(:assets)
      app.config.assets.paths << Engine.root.join('app/assets/stylesheets').to_s if app.config.respond_to?(:assets)
    end
  end
end
