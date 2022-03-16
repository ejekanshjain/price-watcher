import axios from 'axios'
import * as cheerio from 'cheerio'
import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import * as Twilio from 'twilio'

admin.initializeApp()

export const scheduledFunction = functions
  .region('asia-south1')
  .pubsub.schedule('0 9,18 * * *')
  .timeZone('Asia/Kolkata')
  .onRun(async context => {
    const timestamp = new Date().toISOString()
    const db = admin.firestore()
    const products = await db.collection('products').get()
    const finalData: any[] = []
    products.forEach(product => {
      finalData.push({
        id: product.id,
        ...product.data()
      })
    })
    if (!finalData.length) return
    await Promise.all(
      finalData.map(async fd => {
        try {
          const { data } = await axios.get(fd.url)
          const $ = cheerio.load(data)
          $(fd.priceSelector).each((i, el) => {
            if (i > 0) return
            fd.price = $(el).text().trim()
          })
        } catch (err) {
          fd.error = true
        }
      })
    )
    const twilio = Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
    await twilio.messages.create({
      from: process.env.TWILIO_NUMBER,
      to: process.env.NOTIFY_NUMBER!,
      body: `Price Watcher Results ${timestamp}\n\n\n\n${finalData
        .map(
          fd =>
            `Name: ${fd.name}\n\nURL: ${fd.url}\n\nError: ${
              fd.error ? 'Yes' : 'No'
            }\n\nPrice: ${fd.price}\n\nPrice Selector: ${fd.priceSelector}`
        )
        .join('\n\n\n')}`
    })
  })

export const onDemandFunction = functions
  .region('asia-south1')
  .https.onRequest(async (req, res) => {
    if (req.query.apiKey !== process.env.API_KEY) {
      res.status(401).send('Invalid api key')
      return
    }
    const timestamp = new Date().toISOString()
    const db = admin.firestore()
    const products = await db.collection('products').get()
    const finalData: any[] = []
    products.forEach(product => {
      finalData.push({
        id: product.id,
        ...product.data()
      })
    })
    if (!finalData.length) return
    await Promise.all(
      finalData.map(async fd => {
        try {
          const { data } = await axios.get(fd.url)
          const $ = cheerio.load(data)
          $(fd.priceSelector).each((i, el) => {
            if (i > 0) return
            fd.price = $(el).text().trim()
          })
        } catch (err) {
          fd.error = true
        }
      })
    )
    const twilio = Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
    await twilio.messages.create({
      from: process.env.TWILIO_NUMBER,
      to: process.env.NOTIFY_NUMBER!,
      body: `Price Watcher Results ${timestamp}\n\n\n\n${finalData
        .map(
          fd =>
            `Name: ${fd.name}\n\nURL: ${fd.url}\n\nError: ${
              fd.error ? 'Yes' : 'No'
            }\n\nPrice: ${fd.price}\n\nPrice Selector: ${fd.priceSelector}`
        )
        .join('\n\n\n')}`
    })
    res.send('Done')
  })
