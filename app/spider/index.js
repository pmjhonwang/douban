const request = require('superagent')
const process = require('process')
require('superagent-proxy')(request);

class Spider {
  constructor(db, tags, useProxy, proxys) {
    this.protocol = "http"
    this.url = `${this.protocol}://api.douban.com/v2/movie/search`
    this.ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36"
    this.tags = tags
    this.tagIndex = 0
    this.tag = this.tags[this.tagIndex]
    this.start = 0
    this.db = db
    this.useProxy = useProxy
    this.proxys = proxys || []
    this.proxy = "http://58.52.201.118:8080"
    this.proxyState = {}
    this.set = this.set.bind(this)
  }

  set(tags, tag, start) {
    this.tags = tags
    this.tagIndex = this.tags.findIndex((t) => (t == tag))
    this.tag = this.tags[this.tagIndex]
    this.start = start
  }

  fetch() {
    console.log(this.tag, this.start)
    return new Promise((resolve, reject) => {
      request
        .get(this.url)
        .set({
          "User-Agent": this.ua
        })
        .query({
          tag: this.tag,
          start: this.start
        })
        .end((err, res) => {
          if (err) {
            reject(err)
            return
          }
          resolve(res)
        })
    })
  }

  fetchWithProxy() {
    return new Promise((resolve, reject) => {
      request
        .get(this.url)
        .set({
          "User-Agent": this.ua
        })
        .query({
          tag: this.tag,
          start: this.start
        })
        .proxy(this.proxy)
        .timeout({
          response: 10000, // Wait 20 seconds for the server to start sending,
          deadline: 20000, // but allow 1 minute for the file to finish loading.
        })
        .end((err, res) => {
          if (err) {
            reject(err)
            return
          }

          delete this.proxyState[this.proxy]
          resolve(res)
        })
    })
  }

  insertOne(col, movie) {
    return new Promise((resolve, reject) => {

      let cond = {
        id: movie.id
      }

      let option = {
        upsert: true
      }

      col.update(cond, movie, option, (err) => {
        if (err) {
          reject(err)
        }
        resolve()
      })
    })
  }


  sleep(duration) {
    if (duration == undefined || duration == null) {
      duration = 1
    }
    console.log(`sleep for ${duration} seconds...`)
    return new Promise((resolve, reject) => {
      setTimeout(function() {
        resolve()
      }, 1000 * duration);
    })
  }

  async insert(db, movies) {
    const col = db.collection("movies")
    for (let movie of movies) {
      await this.insertOne(col, movie)
    }
  }

  async next() {
    this.start += 20
      // await this.sleep(0.3)
    this.run()
  }

  async nextTag() {
    this.start = 0
    this.tagIndex++
      this.tag = this.tags[this.tagIndex]
    if (this.tag) {
      this.run()
    } else {
      console.log("Done")
    }
  }

  async run() {
    try {
      let res = {}
      if (this.useProxy) {
        res = await this.fetchWithProxy()
      } else {
        res = await this.fetch()
      }
      const movies = res.body
      if (movies && movies.subjects && movies.subjects.length < 20) {
        await this.insert(this.db, movies.subjects)
        this.nextTag()
        return
      }
      await this.insert(this.db, movies.subjects)
      this.next()
    } catch (err) {
      if (this.useProxy) {
        if (this.proxyState[this.proxy] == undefined) {
          this.proxyState[this.proxy] = 1
        } else {
          this.proxyState[this.proxy]++
        }

        let failCount = this.proxyState[this.proxy]
        console.log(this.tag, this.start, this.proxy, failCount)
        let proxy = this.proxys.shift()

        if (!proxy) {
          console.log("no proxy left")
          process.exit(0)
        }

        if (failCount < 5) {
          this.proxys.push(proxy)
        }

        this.proxy = `${this.protocol}://${proxy}`
      } else {
        await this.sleep(30)
      }

      this.run()
    }
  }
}

module.exports = spider = Spider