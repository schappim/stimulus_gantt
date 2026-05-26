StimulusGanttRails::Engine.routes.draw do
  # Range-windowed task source — RAILS_REFERENCE.md §Routes.
  get    '/:resource/events',                  to: 'events#index',        as: :index_events
  post   '/:resource/events',                  to: 'events#create',       as: :events
  patch  '/:resource/events/:id',              to: 'events#update',       as: :event,
         constraints: { id: %r{[^/]+} }
  delete '/:resource/events/bulk',             to: 'events#destroy_bulk', as: :bulk_events
  delete '/:resource/events/:id',              to: 'events#destroy',      as: :destroy_event,
         constraints: { id: %r{[^/]+} }

  # Bulk operations.
  post '/:resource/bulk',                      to: 'events#bulk',         as: :bulk

  # Resource list (sidebar chip picker).
  get  '/:resource/resources',                 to: 'resources#index',     as: :index_resources

  # Dependency endpoints.
  post   '/:resource/dependencies',            to: 'dependencies#create', as: :dependencies
  delete '/:resource/dependencies/:id',        to: 'dependencies#destroy', as: :dependency,
         constraints: { id: %r{[^/]+} }
end
