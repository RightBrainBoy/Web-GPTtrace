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
  'kprobe:do_nanosleep { printf("PID %d sleeping...\n", pid); }'
  
  # count syscalls by process name
  'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'
  
  # Files opened by process
  'tracepoint:syscalls:sys_enter_open { printf("%s %s\n", comm, str(args->filename)); }'
  
  # Syscall count by program
  'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'
  
  # Read bytes by process:
  'tracepoint:syscalls:sys_exit_read /args->ret/ { @[comm] = sum(args->ret); }'
  
  # Read size distribution by process:
  'tracepoint:syscalls:sys_exit_read { @[comm] = hist(args->ret); }'
  
  # Show per-second syscall rates:
  'tracepoint:raw_syscalls:sys_enter { @ = count(); } interval:s: