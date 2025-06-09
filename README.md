# Airbnb Competitors Scraper

Este projeto é um scraper desenvolvido para coletar informações de concorrentes no Airbnb. Ele utiliza a biblioteca Puppeteer para navegar e extrair dados diretamente das páginas do Airbnb.

## Funcionalidades

- **Geração de URL Dinâmica**: Constrói URLs de pesquisa no Airbnb com base em parâmetros fornecidos.
- **Extração de Dados**: Coleta informações como:
  - `room_id`: Identificador único do quarto.
  - `title`: Título do anúncio.
  - `total_reviews`: Número total de avaliações.
  - `score`: Nota média do anúncio.
- **Simulação de Rolagem**: Garante que todos os elementos sejam carregados antes da extração.
- **Armazenamento no Supabase**: Insere ou atualiza os dados extraídos na tabela `competitors`.

## Resumo do Processo

1. O scraper navega pelas páginas de resultados de busca do Airbnb.
2. Para cada página, ele extrai informações relevantes dos anúncios.
3. A posição de cada anúncio é calculada com base na página e na ordem dentro dela.
4. Os dados são armazenados no banco de dados, garantindo que não haja duplicatas.
5. O número de páginas a serem processadas pode ser configurado no arquivo de configuração.

Este projeto é útil para monitorar e analisar concorrentes no mercado de hospedagem.

## Fluxo de Uso

1. **Definir Parâmetros de Pesquisa**: Forneça os parâmetros necessários, como localização, datas, número de hóspedes, entre outros.
2. **Executar o Scraper**: O scraper navegará até a página do Airbnb, coletará os dados e os armazenará no banco de dados.
3. **Verificar os Dados**: Os dados extraídos estarão disponíveis na tabela `competitors` do Supabase.

## Estrutura do Projeto

- **`src/scraper.js`**: Contém a lógica principal do scraper, incluindo a geração de URLs, extração de dados e integração com o Supabase.
- **`src/config.js`**: (Opcional) Pode ser usado para armazenar configurações do projeto.
- **`index.js`**: Ponto de entrada do projeto.

## Observações

- Certifique-se de que as variáveis de ambiente necessárias para o Supabase estejam configuradas corretamente.
- O scraper foi projetado para lidar com páginas dinâmicas e pode ser ajustado para atender a requisitos específicos.
