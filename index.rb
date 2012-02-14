require 'rubygems'
require 'sinatra'
require 'rest_client'
require 'rest-client'

get '/' do
  erb :index
end

get '/events' do
  resp = RestClient.get "http://api.seatgeek.com/2/events?lat=40.727&lon=-73.99&range=10mi&datetime_local=#{params[:date]}&format=json&per_page=250"
  resp.to_str
end
