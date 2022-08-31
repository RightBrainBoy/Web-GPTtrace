export const getExamples = async (query: string, apiKey: string) => {
  const { MemoryVectorStore } = await import("langchain/vectorstores/memory");
  const { OpenAIEmbeddings } = await import("langchain/embeddings/openai");
  
  const vectorStore = await MemoryVectorStore.fromTexts(
    ["example: Write a BPF code that traces block I/O operations and displays the latency for each operation, along with the disk, process, and PID associated with