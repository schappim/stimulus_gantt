require_relative 'lib/stimulus_gantt_rails/version'

Gem::Specification.new do |spec|
  spec.name        = 'stimulus_gantt_rails'
  spec.version     = StimulusGanttRails::VERSION
  spec.authors     = ['Marcus Schappi']
  spec.email       = ['marcus@chickcom.com']
  spec.summary     = 'Rails + Hotwire companion for stimulus_gantt — live multi-user Gantt over Turbo Streams.'
  spec.description = <<~DESC.tr("\n", ' ')
    Server-driven Gantt engine: declarative Gantt DSL, Broadcastable model concern, custom Turbo
    Stream actions (gantt-task-add/update/remove, gantt-dependency-add/remove, gantt-bulk,
    gantt-conflict), server-side CPM scheduling, version-checked moves, tenant-scoped streams,
    and importmap-pinned JS bundles for the stimulus_gantt library.
  DESC
  spec.homepage = 'https://github.com/schappim/stimulus_gantt'
  spec.license  = 'MIT'

  spec.required_ruby_version = '>= 3.1.0'

  spec.metadata['homepage_uri']    = spec.homepage
  spec.metadata['source_code_uri'] = "#{spec.homepage}/tree/main/gem/stimulus_gantt_rails"
  spec.metadata['changelog_uri']   = "#{spec.homepage}/blob/main/gem/stimulus_gantt_rails/CHANGELOG.md"

  spec.files = Dir.chdir(__dir__) do
    Dir['{app,config,db,lib}/**/*', 'MIT-LICENSE', 'Rakefile', 'README.md']
  end

  spec.add_dependency 'rails',           '>= 7.1'
  spec.add_dependency 'turbo-rails',     '>= 2.0'
  spec.add_dependency 'stimulus-rails',  '>= 1.3'
  spec.add_dependency 'importmap-rails', '>= 2.0'
end
