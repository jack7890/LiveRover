require 'rubygems'
require 'sinatra'
require 'rest_client'
require 'rest-client'

set :protection, :except => :frame_options

get '/' do
  erb :index
end

get '/events' do
  resp = RestClient.get "http://api.seatgeek.com/2/events?lat=#{params[:lat]}&lon=#{params[:lon]}&range=#{params[:radius]}mi&datetime_local=#{params[:date]}&format=json&per_page=400&sort=score.desc"
  resp.to_str
end
