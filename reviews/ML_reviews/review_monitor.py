

def monitor(reviews):
    import pandas as pd

    import random

    import pickle
    import nltk
    import re
    import sklearn

    nltk.download('punkt')
    nltk.download('averaged_perceptron_tagger')
    nltk.download('wordnet')
    # ds = pd.read_csv("reviews.csv",sep="\t")
    # dataset.dropna(inplace=True)
    
    dataset = pd.DataFrame(reviews)
    dataset.rename(columns={'_id':'review_id','author':'customer_id','product_name':'product_title','reviewHead':'review_headline','reviewBody':'review_body','date':'review_date','ip_address':'IP Address'}, inplace=True)

    with open("classifier.pickle","rb") as f:
        clf = pickle.load(f)

    with open("TfidfModel.pickle","rb") as f:
        tfidf = pickle.load(f)

    def getSentiment(text):

        # PREPROCESSING THE DATASET
        text = str(text)
        text = text.lower()
        text = re.sub(r"that's","that is",text)
        text = re.sub(r"there's","there is",text)
        text = re.sub(r"what's","what is",text)
        text = re.sub(r"where's","where is",text)
        text = re.sub(r"it's","it is",text)
        text = re.sub(r"who's","who is",text)
        text = re.sub(r"i'm","i am",text)
        text = re.sub(r"she's","she is",text)
        text = re.sub(r"he's","he is",text)
        text = re.sub(r"they're","they are",text)
        text = re.sub(r"who're","who are",text)
        text = re.sub(r"ain't","am not",text)
        text = re.sub(r"wouldn't","would not",text)
        text = re.sub(r"shouldn't","should not",text)
        text = re.sub(r"can't","can not",text)
        text = re.sub(r"couldn't","could not",text)
        text = re.sub(r"won't","will not",text)
        
        text = re.sub(r"\W"," ",text)
        text = re.sub(r"\d"," ",text)
        text = re.sub(r"\s+[a-z]\s+"," ",text)
        text = re.sub(r"^[a-z]\s+"," ",text)    
        text = re.sub(r"\s+[a-z]$"," ",text)    
        text = re.sub(r"\s+"," ",text)    
        
        sent = clf.predict(tfidf.transform([text]).toarray())
        
        return sent[0]

    remove_reviews = []
    # stores the list of review_id of fake reviews

    # 1. Reviews which have dual view

    for i in range(len(dataset)):
        #iterate through the whole dataset
        
            if( getSentiment( dataset["review_headline"][i] ) != getSentiment( dataset["review_body"][i] ) ):
                # checking if the sentiment of the body and the headline are not same
                
                remove_reviews.append(dataset["review_id"][i])



    #2. Reviews in which same user promoting or demoting a particular brand

    customers = dataset.groupby("customer_id")
    # groups dataset by customers

    customer_list = dataset["customer_id"].unique()
    #list of unique customers
    
    size = len(customer_list.tolist())
    #size of total unique customers

    for i in range(size):
        # iterate through all the customers
        
        brand_df = customers.get_group(customer_list[i])    
        # Dataframe for each customers
        
        brands = brand_df.groupby("product_parent")
        # groups reviews of each customers by brand
        
        brands_list = brand_df["product_parent"].unique()
        # unique list of brands for each customers reviews
        
        no_of_brands = len(brands_list.tolist())
        # no. of brands for which reviews had been written by the customer
        
        for j in range(no_of_brands):
            # iterate through all the brands
            
            product_df = brands.get_group(brands_list[j])
            # Dataframe of products for a brand for which a customer had written reviews
            
            no_of_products = len(product_df["product_id"])
            # no of products
            
            if no_of_products<=2:
                # it will filter the products which are less than 2 for a brand
                continue
                
            indices = product_df.index.values.tolist()
            # index of the dataframe of the products of each brand for each customers
            
            sentiment = getSentiment(product_df["review_body"][indices[0]])
            # sentiment of the review of the first product
            
            isSameSentiment = True
            
            #discarding those cases in which we have only less than 3 reviews on same brand
            if no_of_products<4:
                continue
            
            for k in range(1,no_of_products):
                # iterate through all the products
                
                text = str(product_df["review_body"][indices[k]])
                # review of each product
                
                if getSentiment(text)!=sentiment :
                    # if sentiment is different than discard it
                    isSameSentiment = False
                    break;
                    
            if(isSameSentiment):
                # if sentiments of all the products of same brand by a customer is same, 
                #append customer_id to blocked users list
                
                remove_reviews.append(customer_list[i])
                break



    # 3. Reviews in which person from same IP Address promoting or demoting a particular brand
    ip = dataset.groupby("IP Address")
    #grouping the dataset by ip address

    ip_list = dataset["IP Address"].unique()
    #stores the list pf unique ip addresses

    remove_ip = []
    #stores the list of ip address from where reviews have been written.

    size = len(ip_list.tolist())
    #stores the size of the total unique ip addresses

    for i in range(size):
        # iterate through all the ip addresses
        
        brand_df = ip.get_group(ip_list[i])
        # Dataframe of brands for which reviews have been written from the same ip address
        
        brands = brand_df.groupby("product_parent")
        # grouping the products of the same brands for each ip addresses
        
        brands_list = brand_df["product_parent"].unique()
        #list of unique brands for each ip addresses
        
        no_of_brands = len(brands_list.tolist())
        # total no. of brands
        
        for j in range(no_of_brands):
            # iterate through all the brands
            
            product_df = brands.get_group(brands_list[j])
            # Dataframe of the products of each brand of each products
            
            no_of_products = len(product_df["product_id"])
            # no of products of each brand for each ip addresses
            
            if no_of_products<=2:
                # filter the reviews of the brandswith less than 3 reviews
                break
            
            indices = product_df.index.tolist()
            # indices of dataframe of products of each brand for each customers
            
            sentiment = getSentiment(product_df["review_body"][ indices[0] ])
            # sentiment of review of first product of each brand
                    
            isSameSentiment = True
            
            for k in range(1,no_of_products):
                # iterate through all the reviews
                
                text = str(product_df["review_body"][indices[k]])
                # reviews of each product
                
                if getSentiment(text)!=sentiment :
                    # if sentiment of 2 products of same brand are not same 
                    # then check the next brand
                    isSameSentiment = False
                    break;
                    
            if(isSameSentiment):
                # if all the sentiments are same , append ip to blocked list
                remove_ip.append(ip_list[i])
    print(remove_ip)




    # 4. Reviews which are posted as flood by same user all the reviews are either positive or negative.
    dataset.sort_values("customer_id",inplace=True)
    customer_group = dataset.groupby("customer_id")
    #creates the group of the customers 

    customer_group_list = dataset["customer_id"].unique().tolist()
    # list of unique customers

    for i in range(len(customer_group_list)):
        # iterate through all customers , starts with 1 as column could not be included
        
        customer_reviews = customer_group.get_group( customer_group_list[i] )
        # Dataframe of data of each cutomers
        
        dates_list = customer_reviews["review_date"].unique().tolist()
        # list of dates of reviews written by each customers
        
        reviews_by_date = customer_reviews.groupby("review_date");
        # gouping reviews by date for each cutomers
        
        for j in range(len(dates_list)):
            # iterating through all dates
            
            reviews_by_date_for_pos = []
            reviews_by_date_for_neg = []

            df = reviews_by_date.get_group(dates_list[j])
            #dataframe storing the details for each details for each customers
            
            indices = df.index.tolist()
            # indices of dataframe of each date
            
            for k in range(len(df)):
                # iterating through dataframe of each day for each customers
                
                text = df["review_body"][ indices[k] ]
                #review on a single day
                
                if(getSentiment(text) == 0):
                    
                    #if sentiment is negative, append review_id to list of negative reviews
                    reviews_by_date_for_neg.append(df["review_id"][ indices[k] ])
                    
                else:
                    
                    #if sentiment is positive, append review_id to list of positive reviews
                    reviews_by_date_for_pos.append(df["review_id"][ indices[k] ])
                    
            # CONDITION FOR CONSIDERING THE FAKE REVIEW 
            
            #removing postive reviews that are written by a reviewer that are > 3 on same day
            if(len(reviews_by_date_for_pos)>3):
                remove_reviews.extend(reviews_by_date_for_pos)
            
            #removing postive reviews that are written by a reviewer that are > 3 on same day
            if(len(reviews_by_date_for_neg)>3):
                remove_reviews.extend(reviews_by_date_for_neg)




    # 5. Reviews which are posted as flood by same person from same IP Address
    ip_group = dataset.groupby("IP Address")
    # grouping the dataset by ip addresses

    ip_list = dataset["IP Address"].unique().tolist()
    # stores the list of unique ip addresses

    size = len(ip_list)
    # total no of unique ip addresses

    for i in range(size):
        # iterate through all the ip addresses
        
        reviews = ip_group.get_group( ip_list[i] )
        # dataframe of each ip
        
        dates_list = reviews["review_date"].unique().tolist()
        # list of dates of reviews by each ip addresses
        
        reviews_by_date = reviews.groupby("review_date");
        # grouping the dataframe by date
        
        for j in range(len(dates_list)):
            # iterate through all the dates
            
            reviews_by_date_for_pos = []
            reviews_by_date_for_neg = []

            reviews_for_each_day = reviews_by_date.get_group(dates_list[j])
            #dataframe of reviews for a day by each ip addresses
            
            indices = reviews_for_each_day.index.tolist()
            # list of indices of the dataframe reviews_for_each_day
            
            for k in range(len(reviews_for_each_day)):
                #iterate through all the reviews on a day by each ip addresses
                
                text = reviews_for_each_day["review_body"][ indices[k] ]
                # reviews on a day for an ip addresses
                
                if(getSentiment(text) == 0):
                    
                    #if sentiment is negative, append review_id to list of negative reviews
                    reviews_by_date_for_neg.append(reviews_for_each_day["review_id"][ indices[k] ])
                else:
                    
                    #if sentiment is positive, append review_id to list of positive reviews
                    reviews_by_date_for_pos.append(reviews_for_each_day["review_id"][ indices[k] ])
                    
            # CONDITION FOR CONSIDERING THE FAKE REVIEW        
        
            #removing postive reviews that are written by a reviewer that are > 3 on same day
            if(len(reviews_by_date_for_pos)>3):
                remove_reviews.extend(reviews_by_date_for_pos)
            
            #removing postive reviews that are written by a reviewer that are > 3 on same day
            if(len(reviews_by_date_for_neg)>3):
                remove_reviews.extend(reviews_by_date_for_neg)




    # 7. Reviews in which Reviewer using arming tone to by the product (Action)
    for i in range(len(dataset)):
        #iterate the whole dataset
        
        words = nltk.word_tokenize(str(dataset["review_body"][i]))
        #storing the words from the reviews into the list
        
        tagged_words = nltk.pos_tag(words)
        # returns list of tuples of words along with their parts of speech
        
        nouns_count = 0
        verbs_count = 0
        
        for j in range(len(tagged_words)):
            #iterate through all the words

            if(tagged_words[j][1].startswith("NN")):
                nouns_count+=1
                #counts the no. of nouns in the review

            if(tagged_words[j][1].startswith("VB")):
                verbs_count+=1
                #counts the no. of verbs in the review

        if(verbs_count>nouns_count):
            #comparing the no. of verbs and nouns
            remove_reviews.append(dataset["review_id"][i])
            #storing the review to be removed 



    # 8. Reviews in which reviewer is writing his own story
    for i in range(len(dataset)):
        #iterate through all the reviews
        
        dataset["review_body"][i] = str(dataset["review_body"][i]).lower()
        # converting each characters to its lower cases
        
        words = nltk.word_tokenize(dataset["review_body"][i])
        # storing the list of words for each reviews
        
        sentence = nltk.sent_tokenize(dataset["review_body"][i])
        # storing the list of sentences for each reviews
        
        count=0
        if(len(sentence)>4):
            # Checking only those reviews which have atleast 5 sentences.
            
            for j in range(len(words)):
                #iterating through all the reviews
                
                if(words[j]=="i" or words[j]=="we"):
                    #counting personal pronouns
                    count+=1
                    
            if(count > len(sentence)/2):
                #reviews with number of personal pronouns used greater than half the no. of sentences.
                remove_reviews.append(dataset["review_id"][i])



    # 9. Meaningless Texts in reviews using LSA
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.decomposition import TruncatedSVD
    import nltk
    import re
    from nltk.corpus import stopwords 
    import collections
    from nltk.corpus import wordnet

    dataset.set_index("review_id",inplace=True)

    def LSA(text):
        
        
        vectorizer = TfidfVectorizer()
        X = vectorizer.fit_transform(text)
        
        lsa = TruncatedSVD(n_components = 1,n_iter = 100)
        lsa.fit(X)
        
        terms = vectorizer.get_feature_names()
        concept_words={}

        for j,comp in enumerate(lsa.components_):
            componentTerms = zip(terms,comp)
            sortedTerms = sorted(componentTerms,key=lambda x:x[1],reverse=True)
            sortedTerms = sortedTerms[:10]
            concept_words[str(j)] = sortedTerms
        
        sentence_scores = []
        for key in concept_words.keys():
            for sentence in text:
                words = nltk.word_tokenize(sentence)
                scores = 0
                for word in words:
                    for word_with_scores in concept_words[key]:
                        if word == word_with_scores[0]:
                            scores += word_with_scores[1]
                sentence_scores.append(scores)
        return sentence_scores


    product_df = dataset.groupby("product_id")
    #grouping dataset by product_id

    unique_products = dataset["product_id"].unique()
    #stores list of all product id

    no_products = len(unique_products.tolist())
    #no. of products

    #store review_id that are fake 
        
    for i in range(no_products):
        #iterate through all product reviews 
        
        df = product_df.get_group(unique_products[i])
        #dataframe of a single product
        
        unique_reviews = df.index.tolist()
        #list of review_id of reviews of same product
        
        no_reviews = len(unique_reviews)   
        #no. of reviews of same product
        
        count = no_reviews 
        #count is no. of reviews that can be analysed
        
        reviews = []
        #list of review texts
        
        review_id = []
        #list of review texts
        
        for j in range(no_reviews):
            #iterate through all reviews
            
            text = str(df.loc[unique_reviews[j]]["review_body"])
            # text of a review 
            
            #cleaning the text
            text = re.sub(r"\W"," ",text)             
            text = re.sub(r"\d"," ",text)             
            text = re.sub(r"\s+[a-z]\s+"," ",text)    
            text = re.sub(r"^[a-z]\s+"," ",text)    
            text = re.sub(r"\s+[a-z]$"," ",text)    
            text = re.sub(r"\s+"," ",text)
            
            words = nltk.word_tokenize(text)
            #text into word list
            
            if(len(words)==1):
            #if only one word in text review
                
                if(len(text) <=1 or not wordnet.synsets(text) ):
                #if word is having only one character or invalid english word
                    
                    remove_reviews.append(unique_reviews[j])
                    #append this review as fake
                    
                    count-=1
                    #review left to be analysed will be decrease by 1
                    
                    continue
                    #check for next review 
                    
            elif(len(words)==0):
            #if no words
                
                remove_reviews.append(unique_reviews[j])
                #append this review as fake
                
                count-=1
                #review left to be analysed will be decrease by 1
                
                continue
                #check for next review
            
            review_id.append(unique_reviews[j])
            #valid: append review_id to review_id list for analysis
            
            reviews.append(text)
            #valid: append review_body to reviews list for analysis
            
        ###########################################################################################
        if(count<=0):
            #if no reviews left to analyse 

            continue
            #check for next
            
        if(count==1): 
            #if only one review is left to analyse
            
            #check concept between product title and the review
            
            text = [text,str(df.loc[review_id[0]]["product_title"])] 
            #add product_title and review to the list 
            
            sentence_scores = LSA(text) 
            #call LSA method to get the score
            
            if(sentence_scores[0]==0): 
            #if review score is 0, then it's fake
                remove_reviews.append(review_id[0])
            continue
        
        #list of scores of reviews of same product
        sentence_scores = LSA(reviews)
                
        for j in range(len(sentence_scores)):
            #iterating through all the scores
            
            if(sentence_scores[j]==0.00):
                # if score is 0, it's fake
                remove_reviews.append(review_id[j])

    print(set(remove_reviews))
    print(set(remove_ip))
    result = []
    result.append(list(set(remove_reviews)))
    result.append(list(set(remove_ip)))
    return result