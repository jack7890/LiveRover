require 'rubygems'
require 'sinatra'
require 'rest_client'
require 'rest-client'

set :protection, :except => :frame_options

get '/' do
  erb :index
end

get '/events' do
  resp = RestClient.get "http://api.seatgeek.com/2" + request.env["REQUEST_URI"]
  resp.to_str
end
