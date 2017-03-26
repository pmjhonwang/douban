const request = require('superagent')
require('superagent-proxy')(request);

function fetchWithProxy(proxy) {
  return new Promise((resolve, reject) => {
    request
      .get('http://www.qiniu.com/qiniu_do_not_delete.gif')
      .timeout({
        response: 5000,
        deadline: 10000,
      })
      .proxy(`http://${proxy}`)
      .end((err, res) => {
        if (err) {
          reject(err)
          return
        }
        resolve(res)
      });
  })
}

async function main() {


  for (proxy of proxys) {
    try {
      const res = await fetchWithProxy(proxy)
      console.log(proxy)
    } catch (err) {
      // console.log("bad", proxy)
    }

  }
}

main()