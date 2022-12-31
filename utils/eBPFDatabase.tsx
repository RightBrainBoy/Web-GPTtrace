export const getExamples = async (query: string, apiKey: string) => {
  const { MemoryVectorStore } = await import("langchain/vectorstores/memory");
  const { OpenAIEmbeddings } = await import("langchain/embeddings/openai");
  
  const vectorStore = await MemoryVectorStore.fromTexts(
    ["example: Write a BPF code that traces block I/O operations and displays the latency for each operation, along with the disk, process, and PID associated with it.\n\n```\n#ifndef BPFTRACE_HAVE_BTF\n#include <linux/blkdev.h>\n#include <linux/blk-mq.h>\n#endif\n\nBEGIN\n{\n\tprintf(\"%-12s %-7s %-16s %-6s %7s\\n\", \"TIME(ms)\", \"DISK\", \"COMM\", \"PID\", \"LAT(ms)\");\n}\n\nkprobe:blk_account_io_start,\nkprobe:__blk_account_io_start\n{\n\t@start[arg0] = nsecs;\n\t@iopid[arg0] = pid;\n\t@iocomm[arg0] = comm;\n\t@disk[arg0] = ((struct request *)arg0)->q->disk->disk_name;\n}\n\nkprobe:blk_account_io_done,\nkprobe:__blk_account_io_done\n/@start[arg0] != 0 && @iopid[arg0] != 0 && @iocomm[arg0] != \"\"/\n\n{\n\t$now = nsecs;\n\tprintf(\"%-12u %-7s %-16s %-6d %7d\\n\",\n\t    elapsed / 1e6, @disk[arg0], @iocomm[arg0], @iopid[arg0],\n\t    ($now - @start[arg0]) / 1e6);\n\n\tdelete(@start[arg0]);\n\tdelete(@iopid[arg0]);\n\tdelete(@iocomm[arg0]);\n\tdelete(@disk[arg0]);\n}\n\nEND\n{\n\tclear(@start);\n\tclear(@iopid);\n\tclear(@iocomm);\n\tclear(@disk);\n}\n\n```\n",
    "example: Write a BPF code that traces directory entry cache (dcache) lookups in the Linux kernel. The code uses kernel dynamic tracing of functions lookup_fast() and d_lookup() to capture lookup information and prints the time, process ID, command, and file name for each lookup event.\n\n```\n#ifndef BPFTRACE_HAVE_BTF\n#include <linux/fs.h>\n#include <linux/sched.h>\n\n// from fs/namei.c:\nstruct nameidata {\n        struct path     path;\n        struct qstr     last;\n        // [...]\n};\n#endif\n\nBEGIN\n{\n\tprintf(\"Tracing dcache lookups... Hit Ctrl-C to end.\\n\");\n\tprintf(\"%-8s %-6s %-16s %1s %s\\n\", \"TIME\", \"PID\", \"COMM\", \"T\", \"FILE\");\n}\n\n// comment out this block to avoid showing hits:\nkprobe:lookup_fast,\nkprobe:lookup_fast.constprop.*\n{\n\t$nd = (struct nameidata *)arg0;\n\tprintf(\"%-8d %-6d %-16s R %s\\n\", elapsed / 1e6, pid, comm,\n\t    str($nd->last.name));\n}\n\nkprobe:d_lookup\n{\n\t$name = (struct qstr *)arg1;\n\t@fname[tid] = $name->name;\n}\n\nkretprobe:d_lookup\n/@fname[tid]/\n{\n\tprintf(\"%-8d %-6d %-16s M %s\\n\", elapsed / 1e6, pid, comm,\n\t    str(@fname[tid]));\n\tdelete(@fname[tid]);\n}\n\n```\n",
    "example: Write a BPF code that lists new thread creations, printing the time in milliseconds, PID, process name, and function name where the thread was created.\n\n```\nBEGIN\n{\n\tprintf(\"%-10s %-6s %-16s %s\\n\", \"TIME(ms)\", \"PID\", \"COMM\", \"FUNC\");\n}\n\nuprobe:libpthread:pthread_create,\nuprobe:libc:pthread_create\n{\n\tprintf(\"%-10u %-6d %-16s %s\\n\", elapsed / 1e6, pid, comm,\n\t    usym(arg2));\n}\n\n```\n",
    "example: Write a BPF code that traces block device I/O and creates histograms of I/O size in bytes for each process.\n\n```\nBEGIN\n{\n\tprintf(\"Tracing block device I/O... Hit Ctrl-C to end.\\n\");\n}\n\ntracepoint:block:block_rq_issue\n{\n\t@[args.comm] = hist(args.bytes);\n}\n\nEND\n{\n\tprintf(\"\\nI/O size (bytes) histograms by process name:\");\n}\n\n```\n",
    "example: Write a BPF code that traces file system writeback events, including the time of occurrence, device information, reason, and duration. This code can help identify performance issues related to writeback events.\n\n```\nBEGIN\n{\n\tprintf(\"Tracing writeback... Hit Ctrl-C to end.\\n\");\n\tprintf(\"%-9s %-8s %-8s %-16s %s\\n\", \"TIME\", \"DEVICE\", \"PAGES\",\n\t    \"REASON\", \"ms\");\n\n\t// see /sys/kernel/debug/tracing/events/writeback/writeback_start/format\n\t@reason[0] = \"background\";\n\t@reason[1] = \"vmscan\";\n\t@reason[2] = \"sync\";\n\t@reason[3] = \"periodic\";\n\t@reason[4] = \"laptop_timer\";\n\t@reason[5] = \"free_more_memory\";\n\t@reason[6] = \"fs_free_space\";\n\t@reason[7] = \"forker_thread\";\n}\n\ntracepoint:writeback:writeback_start\n{\n\t@start[args.sb_dev] = nsecs;\n}\n\ntracepoint:writeback:writeback_written\n{\n\t$sb_dev = args.sb_dev;\n\t$s = @start[$sb_dev];\n\tdelete(@start[$sb_dev]);\n\t$lat = $s ? (nsecs - $s) / 1000 : 0;\n\n\ttime(\"%H:%M:%S  \");\n\tprintf(\"%-8s %-8d %-16s %d.%03d\\n\", args.name,\n\t    args.nr_pages & 0xffff,\t// TODO: explain these bitmasks\n\t    @reason[args.reason & 0xffffffff],\n\t    $lat / 1000, $lat % 1000);\n}\n\nEND\n{\n\tclear(@reason);\n\tclear(@start);\n}\n\n```\n",
    "example: Write a BPF code that traces block device I/O by measuring the latency of block I/O operations and grouping them into a histogram.\n\n```\nBEGIN\n{\n\tprintf(\"Tracing block device I/O... Hit Ctrl-C to end.\\n\");\n}\n\ntracepoint:block:block_bio_queue\n{\n\t@start[args.sector] = nsecs;\n}\n\ntracepoint:block:block_rq_complete,\ntracepoint:block:block_bio_complete\n/@start[args.sector]/\n{\n\t@usecs = hist((nsecs - @start[args.sector]) / 1000);\n\tdelete(@start[args.sector]);\n}\n\nEND\n{\n\tclear(@start);\n}\n\n```\n",
    "example: Write a BPF code that traces SSL/TLS handshake for OpenSSL, showing the latency, return value, and function information. This code is useful for analyzing SSL/TLS performance.\n\n```\n#!/usr/bin/bpftrace\n\n\nBEGIN\n{\n\tprintf(\"Tracing SSL/TLS handshake... Hit Ctrl-C to end.\\n\");\n\tprintf(\"%-10s %-8s %-8s %7s %5s %s\\n\", \"TIME(us)\", \"TID\",\n\t       \"COMM\", \"LAT(us)\", \"RET\", \"FUNC\");\n}\n\nuprobe:libssl:SSL_read,\nuprobe:libssl:SSL_write,\nuprobe:libssl:SSL_do_handshake\n{\n\t@start_ssl[tid] = nsecs;\n\t@func_ssl[tid] = func; // store for uretprobe\n}\n\nuretprobe:libssl:SSL_read,\nuretprobe:libssl:SSL_write,\nuretprobe:libssl:SSL_do_handshake\n/@start_ssl[tid] != 0/\n{\n\tprintf(\"%-10u %-8d %-8s %7u %5d %s\\n\", elapsed/1000, tid, comm,\n\t       (nsecs - @start_ssl[tid])/1000, retval, @func_ssl[tid]);\n\tdelete(@start_ssl[tid]); delete(@func_ssl[tid]);\n}\n\n// need debug symbol for ossl local functions\nuprobe:libcrypto:rsa_ossl_public_encrypt,\nuprobe:libcrypto:rsa_ossl_public_decrypt,\nuprobe:libcrypto:rsa_ossl_private_encrypt,\nuprobe:libcrypto:rsa_ossl_private_decrypt,\nuprobe:libcrypto:RSA_sign,\nuprobe:libcrypto:RSA_verify,\nuprobe:libcrypto:ossl_ecdsa_sign,\nuprobe:libcrypto:ossl_ecdsa_verify,\nuprobe:libcrypto:ossl_ecdh_compute_key\n{\n\t@start_crypto[tid] = nsecs;\n\t@func_crypto[tid] = func; // store for uretprobe\n}\n\nuretprobe:libcrypto:rsa_ossl_public_encrypt,\nuretprobe:libcrypto:rsa_ossl_public_decrypt,\nuretprobe:libcrypto:rsa_ossl_private_encrypt,\nuretprobe:libcrypto:rsa_ossl_private_decrypt,\nuretprobe:libcrypto:RSA_sign,\nuretprobe:libcrypto:RSA_verify,\nuretprobe:libcrypto:ossl_ecdsa_sign,\nuretprobe:libcrypto:ossl_ecdsa_verify,\nuretprobe:libcrypto:ossl_ecdh_compute_key\n/@start_crypto[tid] != 0/\n{\n\tprintf(\"%-10u %-8d %-8s %7u %5d %s\\n\", elapsed/1000, tid, comm,\n\t       (nsecs - @start_crypto[tid])/1000, retval, @func_crypto[tid]);\n\tdelete(@start_crypto[tid]); delete(@func_crypto[tid]);\n}\n\n```\n",
    "example: Write a BPF code that traces TCP accept()s by dynamically tracing the kernel inet_csk_accept() socket function and prints information such as the time, process ID, communication, remote and local addresses and ports, and backlog length.\n\n```\n#ifndef BPFTRACE_HAVE_BTF\n#include <linux/socket.h>\n#include <net/sock.h>\n#else\n#include <sys/socket.h>\n#endif\n\nBEGIN\n{\n\tprintf(\"Tracing TCP accepts. Hit Ctrl-C to end.\\n\");\n\tprintf(\"%-8s %-6s %-14s \", \"TIME\", \"PID\", \"COMM\");\n\tprintf(\"%-39s %-5s %-39s %-5s %s\\n\", \"RADDR\", \"RPORT\", \"LADDR\",\n\t    \"LPORT\", \"BL\");\n}\n\nkretprobe:inet_csk_accept\n{\n\t$sk = (struct sock *)retval;\n\t$inet_family = $sk->__sk_common.skc_family;\n\n\tif ($inet_family == AF_INET || $inet_family == AF_INET6) {\n\t\t// initialize variable type:\n\t\t$daddr = ntop(0);\n\t\t$saddr = ntop(0);\n\t\tif ($inet_family == AF_INET) {\n\t\t\t$daddr = ntop($sk->__sk_common.skc_daddr);\n\t\t\t$saddr = ntop($sk->__sk_common.skc_rcv_saddr);\n\t\t} else {\n\t\t\t$daddr = ntop(\n\t\t\t    $sk->__sk_common.skc_v6_daddr.in6_u.u6_addr8);\n\t\t\t$saddr = ntop(\n\t\t\t    $sk->__sk_common.skc_v6_rcv_saddr.in6_u.u6_addr8);\n\t\t}\n\t\t$lport = $sk->__sk_common.skc_num;\n\t\t$dport = $sk->__sk_common.skc_dport;\n\t\t$qlen  = $sk->sk_ack_backlog;\n\t\t$qmax  = $sk->sk_max_ack_backlog;\n\n\t\t// Destination port is big endian, it must be flipped\n\t\t$dport = bswap($dport);\n\n\t\ttime(\"%H:%M:%S \");\n\t\tprintf(\"%-6d %-14s \", pid, comm);\n\t\tprintf(\"%-39s %-5d %-39s %-5d \", $daddr, $dport, $saddr,\n\t\t    $lport);\n\t\tprintf(\"%d/%d\\n\", $qlen, $qmax);\n\t}\n}\n\n```\n",
    "example: Please write a BPF code that traces signals issued by the kill() syscall and prints information such as the timestamp, process ID, command, signal, target process ID, and the result of the kill() syscall.\n\n```\nBEGIN\n{\n\tprintf(\"Tracing kill() signals... Hit Ctrl-C to end.\\n\");\n\tprintf(\"%-9s %-6s %-16s %-4s %-6s %s\\n\", \"TIME\", \"PID\", \"COMM\", \"SIG\",\n\t    \"TPID\", \"RESULT\");\n}\n\ntracepoint:syscalls:sys_enter_kill\n{\n\t@tpid[tid] = args.pid;\n\t@tsig[tid] = args.sig;\n}\n\ntracepoint:syscalls:sys_exit_kill\n/@tpid[tid]/\n{\n\ttime(\"%H:%M:%S  \");\n\tprintf(\"%-6d %-16s %-4d %-6d %d\\n\", pid, comm, @tsig[tid], @tpid[tid],\n\t    args.ret);\n\tdelete(@tpid[tid]);\n\tdelete(@tsig[tid]);\n}\n\n```\n",
    "example: Write a BPF code that traces dropped TCP packets in the Linux kernel, providing details such as packet information, socket state, and kernel stack trace for each dropped packet.\n\n```\n#ifndef BPFTRACE_HAVE_BTF\n#include <linux/socket.h>\n#include <net/sock.h>\n#else\n#include <sys/socket.h>\n#endif\n\nBEGIN\n{\n  printf(\"Tracing tcp drops. Hit Ctrl-C to end.\\n\");\n  printf(\"%-8s %-8s %-16s %-21s %-21s %-8s\\n\", \"TIME\", \"PID\", \"COMM\", \"SADDR:SPORT\", \"DADDR:DPORT\", \"STATE\");\n\n  // See https://github.com/torvalds/linux/blob/master/include/net/tcp_states.h\n  @tcp_states[1] = \"ESTABLISHED\";\n  @tcp_states[2] = \"SYN_SENT\";\n  @tcp_states[3] = \"SYN_RECV\";\n  @tcp_states[4] = \"FIN_WAIT1\";\n  @tcp_states[5] = \"FIN_WAIT2\";\n  @tcp_states[6] = \"TIME_WAIT\";\n  @tcp_states[7] = \"CLOSE\";\n  @tcp_states[8] = \"CLOSE_WAIT\";\n  @tcp_states[9] = \"LAST_ACK\";\n  @tcp_states[10] = \"LISTEN\";\n  @tcp_states[11] = \"CLOSING\";\n  @tcp_states[12] = \"NEW_SYN_RECV\";\n}\n\ntracepoint:skb:kfree_skb\n{\n  $reason = args.reason;\n  $skb = (