var mongodb = require("mongodb")

class MovieDb {
  constructor(host) {
    this.tag = "MovieDb"
    this.host = host
  }

  init() {
    return new Promise((resolve, reject) => {
      mongodb.MongoClient.connect(this.host, function(err, db) {
        console.log("Connected correctly to server.");
        if (err) {
          reject(err)
          return
        }
        resolve(db)
      });
    })
  }
}

module.exports = moviedb = MovieDb