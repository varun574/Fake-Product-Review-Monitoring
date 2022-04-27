from flask import Flask, jsonify, request
from ML_reviews import app
from ML_reviews.rate import rate
from ML_reviews.review_monitor import monitor

@app.route("/")
def home():
    return "A"

@app.route("/rate", methods = ['POST'])
def findrating():
    if request.method == 'POST':
        print(request.json)
        rating = rate(request.json['review_heading']+"\n"+request.json['review_body'])
        return jsonify({'rating' : rating})

@app.route("/monitor",methods = ['POST'])
def reviewsmonitor():
    if request.method == 'POST':
        print(request.json)
        result = monitor(request.json['reviews'])
        print(result)
        return jsonify({"remove_reviews" : result[0], "remove_ip" : result[1]})


