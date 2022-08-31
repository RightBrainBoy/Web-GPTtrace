export const getExamples = async (query: string, apiKey: string) => {
  const { MemoryVectorStore } = await import("langchain/vectorstores/memory");
  const { OpenAIEmbeddings } = await import("langchain/embeddings/openai");
  
  const vectorStore = await MemoryVectorStore.fromTexts(
    ["example: Write a BPF code that traces block I/O operations and displays the latency for each operation, along with the disk, process, and PID associated with it.\n\n```\n#ifndef BPFTRACE_HAVE_BTF\n#include <linux/blkdev.h>\n#include <linux/blk-mq.h>\n#endif\n\nBEGIN\n{\n\tprintf(\"%-12s %-7s %-16s %-6s %7s\\n\", \"TIME(ms)\", \"DISK\", \"COMM\", \"PID\", \"LAT(ms)\");\n}\n\nkprobe:blk_account_io_