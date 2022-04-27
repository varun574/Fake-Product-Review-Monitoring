from flask import Flask,request


app = Flask(__name__)

from ML_reviews import routes
