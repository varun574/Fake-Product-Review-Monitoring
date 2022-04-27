import json
import pickle
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.svm import LinearSVC
from sklearn.metrics import accuracy_score
from sklearn.metrics import classification_report
from sklearn.feature_extraction.text import TfidfVectorizer
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
import nltk


f = open("reviews.json")
reviews = f.read().strip().split("\n")
reviews = [json.loads(review) for review in reviews] 

texts = [review['reviewText'] for review in reviews]
stars = [review['reviewRating'] for review in reviews]

vectorizer = TfidfVectorizer(ngram_range=(1,2))
vectors = vectorizer.fit_transform(texts)

stop_words = set(stopwords.words('english'))

def rate(review):
    # file = open("userReview.txt", "r")
    # contents = file.read()
    # print(contents)
    list1 = [review]
    words = review.split()
    rcount=0
    tokenizedtext = " "

    for r in words:
        if not r in stop_words:
            tokenizedtext = tokenizedtext+" "+r
            rcount = rcount+1

    if rcount==0:
        print("no review")
        return 0
    else:
        #print("after removing stopwords")
        list1 = [tokenizedtext]
        vec1 = vectorizer.transform(list1)
        with open('myClassifier.pkl', 'rb') as fid:
            loaded_classifier = pickle.load(fid)
        #list1.reshape(1, -1)
        mypred = loaded_classifier.predict(vec1)
        print(int(mypred[0]))
        return int(mypred[0])