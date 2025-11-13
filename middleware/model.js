
import Models from '../middleware/models';

let modelInstance = null;

async function initializeModel () {
  if (!modelInstance) {

    let model;
    model = new Models.openai(process.env.EMBEDDING_APIKEY);
    console.log("Using bailian embeddings");

    // 排名算法，暂时屏蔽
    // const rerankProvider = process.env.RERANK_PROVIDER;
    // let rerank_model;
    // if (rerankProvider == "voyageai") {
    //   rerank_model = new Models.voyageai(process.env.RERANK_APIKEY);
    //   console.log("Using Voyage AI reranking");
    // }

    modelInstance = {
      model,
      // rerank_model
    };
  }
  return modelInstance;
}

// Initialize immediately and store promise
const modelInitPromise = initializeModel();

export {
  initializeModel, modelInitPromise
};