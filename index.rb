require 'rubygems'
require 'sinatra'
require 'rest_client'
require 'rest-client'

get '/' do
  erb :index
end

get '/events' do
  resp = RestClient.get 'http://api.seatgeek.com/2/events?lat=40.727&lon=-73.99&range=2mi&datetime_local=2012-02-12&format=json'
  resp.to_str
end
