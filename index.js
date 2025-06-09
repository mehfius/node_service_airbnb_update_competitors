const puppeteer = require('puppeteer');
const { searchParams } = require('./src/config');
const { getAirbnbListingDetails, scrapeAndSave } = require('./src/scraper');

getAirbnbListingDetails(searchParams);
scrapeAndSave(searchParams);