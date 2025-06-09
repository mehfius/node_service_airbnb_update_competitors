// src/scraper.js
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(supabaseUrl, supabaseServiceRole);

function buildAirbnbUrl(params) {
    const baseUrl = 'https://www.airbnb.com.br';
    const path = `/s/${params.location_path}/homes`;
    const queryParams = new URLSearchParams();
    queryParams.append('checkin', params.checkin_date);
    queryParams.append('checkout', params.checkout_date);
    queryParams.append('adults', params.num_adults);
    queryParams.append('query', params.search_query_display);
    queryParams.append('min_bedrooms', params.min_bedrooms);
    params.refinement_paths.forEach(p => queryParams.append('refinement_paths[]', p));
    params.room_types.forEach(rt => queryParams.append('room_types[]', rt));
    params.amenities.forEach(a => queryParams.append('amenities[]', a));
    params.flexible_trip_lengths.forEach(ftl => queryParams.append('flexible_trip_lengths[]', ftl));
    queryParams.append('acp_id', params.acp_id);
    queryParams.append('date_picker_type', params.date_picker_type);
    queryParams.append('place_id', params.place_id);
    queryParams.append('source', params.source);
    queryParams.append('search_type', params.search_type);
    queryParams.append('parent_city_place_id', params.parent_city_place_id);
    queryParams.append('monthly_start_date', params.monthly_start_date);
    queryParams.append('monthly_length', params.monthly_length);
    queryParams.append('monthly_end_date', params.monthly_end_date);
    queryParams.append('search_mode', params.search_mode);
    queryParams.append('price_filter_input_type', params.price_filter_input_type);
    queryParams.append('price_filter_num_nights', params.price_filter_num_nights);
    queryParams.append('channel', params.channel);
    queryParams.append('update_selected_filters', params.update_selected_filters);
    queryParams.append('pagination_search', params.pagination_search);
    queryParams.append('federated_search_session_id', params.federated_search_session_id);
    queryParams.append('cursor', params.cursor);
    if (params.room_types.includes('Entire home/apt')) {
        queryParams.append('selected_filter_order[]', 'room_types:Entire home/apt');
    }
    if (params.min_bedrooms) {
        queryParams.append('selected_filter_order[]', `min_bedrooms:${params.min_bedrooms}`);
    }
    params.amenities.forEach(a => {
        queryParams.append('selected_filter_order[]', `amenities:${a}`);
    });
    return `${baseUrl}${path}?${queryParams.toString()}`;
}

async function getAirbnbListingDetails(params) {
    const airbnbUrl = buildAirbnbUrl(params);
    console.log('URL de Scraping Gerada:', airbnbUrl);
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-gpu',
                '--enable-logging',
                '--disable-dev-shm-usage',
                '--incognito'
            ]
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1440, height: 900 });
        console.log('Navegando para a URL:', airbnbUrl);
        await page.goto(airbnbUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
        const itemSelector = 'div[itemprop="itemListElement"]';
        const expectedMinCount = 18;
        console.log(`Aguardando até que haja pelo menos ${expectedMinCount} elementos com o seletor '${itemSelector}'...`);
        try {
            await page.waitForFunction(
                (selector, expectedCount) => {
                    return document.querySelectorAll(selector).length >= expectedCount;
                },
                { timeout: 60000, polling: 'raf' },
                itemSelector,
                expectedMinCount
            );
            console.log(`Pelo menos ${expectedMinCount} elementos encontrados ou tempo limite alcançado.`);
            console.log('Simulando rolagem para garantir que todos os elementos sejam carregados...');
            for (let i = 0; i < 3; i++) {
                await page.evaluate(() => {
                    window.scrollBy(0, window.innerHeight * 0.8);
                });
                await page.waitForTimeout(1500);
            }
            console.log('Pausa final de 2 segundos antes da extração...');
            await page.waitForTimeout(2000);
        } catch (waitError) {
            console.warn(`Aviso: Erro ao esperar pelos elementos: ${waitError.message}. Tentando extrair o que foi carregado.`);
        }
        const listings = await page.evaluate((selector) => {
            const elements = document.querySelectorAll(selector);
            const data = [];
            const roomIdRegex = /\/rooms\/(\d+)\?/;
            elements.forEach(el => {
                const nameMeta = el.querySelector('meta[itemprop="name"]');
                const urlMeta = el.querySelector('meta[itemprop="url"]');
                let name = null;
                let roomId = null;
                let fullUrl = null;
                if (nameMeta) {
                    name = nameMeta.getAttribute('content');
                }
                if (urlMeta) {
                    fullUrl = urlMeta.getAttribute('content');
                    const match = fullUrl.match(roomIdRegex);
                    if (match && match[1]) {
                        roomId = match[1];
                    }
                }

                // Capturar total_reviews e score
                let totalReviews = null;
                let score = null;
                const targetSvg = el.querySelector('svg:has(path[fill-rule="evenodd"])');
                if (targetSvg) {
                    const immediateParentSpan = targetSvg.parentNode;
                    if (immediateParentSpan) {
                        const grandParentSpan = immediateParentSpan.parentNode;
                        if (grandParentSpan) {
                            const ratingSpan = grandParentSpan.querySelector(':scope > span:last-child');
                            if (ratingSpan) {
                                const textContent = ratingSpan.textContent.trim();
                                const match = textContent.match(/(\d+,\d+)\s*\((\d+)\)/);
                                if (match) {
                                    score = parseFloat(match[1].replace(',', '.')); // Converte "5,0" para 5.0
                                    totalReviews = parseInt(match[2], 10); // Converte "4" para 4
                                }
                            }
                        }
                    }
                }

                if (name || roomId) {
                    data.push({
                        name: name,
                        roomId: roomId,
                        total_reviews: totalReviews,
                        score: score
                    });
                }
            });
            return data;
        }, itemSelector);
        console.log(`Total de listings encontrados: ${listings.length}`);
        console.log('Detalhes dos listings:', listings);
        return listings;
    } catch (error) {
        console.error('Ocorreu um erro geral durante o scraping:', error);
        return null;
    } finally {
        if (browser) {
            await browser.close();
            console.log('Navegador fechado.');
        }
    }
}

async function insertScrapedData(data) {
    try {
        console.log('Dados a serem inseridos ou atualizados:', data); // Log dos dados
        const { data: upsertedData, error } = await supabase
            .from('competitors') // Atualiza a tabela para 'competitors'
            .upsert(data, { onConflict: ['room_id'] }); // Define o campo único para upsert

        if (error) {
            console.error('Erro ao inserir ou atualizar dados:', error);
            throw new Error(`Erro ao inserir ou atualizar dados no Supabase: ${error.message}`); // Gera erro explícito
        } else {
            console.log('Dados inseridos ou atualizados com sucesso:', upsertedData); // Log dos dados inseridos ou atualizados
        }
    } catch (err) {
        console.error('Erro inesperado:', err);
        throw err; // Propaga o erro para o chamador
    }
}

async function scrapeAndSave(params) {
    const scrapedData = await getAirbnbListingDetails(params);

    const formattedData = scrapedData.map(item => ({
        room_id: item.roomId,
        title: item.name, // Apenas os campos room_id e title
        total_reviews: item.total_reviews, // Adiciona total_reviews
        score: item.score // Adiciona score
    }));

    console.log('Dados formatados para inserção:', formattedData); // Log dos dados formatados

    await insertScrapedData(formattedData);
}

module.exports = { getAirbnbListingDetails, scrapeAndSave };
