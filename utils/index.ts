import { ParsedEvent, ReconnectInterval } from '@/types/types';
import { getExamples } from './eBPFDatabase';

const createPrompt = async (
  query: string,
  apiKey: string,
) => {
  const complexExamples = await getExamples(query, apiKey);
  const PROMPT = `
  Please create a BPFTrace program that accomplishes the following task: ${query}
  The program should be syntactically correct and ready for execution. 
  You can assume that the required BPFTrace probes and functions are available.
  Below are some simple examples of bpftrace usage:
  
  # trace processes calling sleep
  'kprobe:do_nanosleep { printf("PID %d sleeping...\n", p