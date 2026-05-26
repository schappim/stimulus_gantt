require 'stimulus_gantt_rails/version'
require 'stimulus_gantt_rails/engine'
require 'stimulus_gantt_rails/field'
require 'stimulus_gantt_rails/calendar'
require 'stimulus_gantt_rails/gantt'
require 'stimulus_gantt_rails/turbo_streams_helper'
require 'stimulus_gantt_rails/concerns/broadcastable'

module StimulusGanttRails
  class Veto < StandardError; end

  class << self
    attr_writer :parent_controller

    def parent_controller
      @parent_controller ||= 'ApplicationController'
    end

    def mount_path
      @mount_path || '/gantts'
    end

    def mount_path=(path)
      @mount_path = path.to_s.sub(%r{/+\z}, '')
    end
  end

  def self.registry
    @registry ||= {}
  end

  def self.register_gantt(resource, klass)
    registry[resource.to_s] = klass
  end

  def self.lookup_gantt(resource)
    registry[resource.to_s] or
      raise ArgumentError, "No Gantt registered for resource #{resource.inspect}. " \
                           'Did you define a StimulusGanttRails::Gantt subclass and reference it from a view?'
  end

  def self.tenant_stream_token
    return nil unless defined?(ActsAsTenant) && ActsAsTenant.respond_to?(:current_tenant)

    tenant = ActsAsTenant.current_tenant
    tenant ? "sgr-tenant:#{tenant.class.name}:#{tenant.id}" : nil
  end

  def self.streamables_for(resource, *extra)
    [tenant_stream_token, "sgr-gantt:#{resource}", *extra].compact
  end
end
