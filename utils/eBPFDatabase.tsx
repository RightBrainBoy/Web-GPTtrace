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
    "example: Write a BPF code that traces dropped TCP packets in the Linux kernel, providing details such as packet information, socket state, and kernel stack trace for each dropped packet.\n\n```\n#ifndef BPFTRACE_HAVE_BTF\n#include <linux/socket.h>\n#include <net/sock.h>\n#else\n#include <sys/socket.h>\n#endif\n\nBEGIN\n{\n  printf(\"Tracing tcp drops. Hit Ctrl-C to end.\\n\");\n  printf(\"%-8s %-8s %-16s %-21s %-21s %-8s\\n\", \"TIME\", \"PID\", \"COMM\", \"SADDR:SPORT\", \"DADDR:DPORT\", \"STATE\");\n\n  // See https://github.com/torvalds/linux/blob/master/include/net/tcp_states.h\n  @tcp_states[1] = \"ESTABLISHED\";\n  @tcp_states[2] = \"SYN_SENT\";\n  @tcp_states[3] = \"SYN_RECV\";\n  @tcp_states[4] = \"FIN_WAIT1\";\n  @tcp_states[5] = \"FIN_WAIT2\";\n  @tcp_states[6] = \"TIME_WAIT\";\n  @tcp_states[7] = \"CLOSE\";\n  @tcp_states[8] = \"CLOSE_WAIT\";\n  @tcp_states[9] = \"LAST_ACK\";\n  @tcp_states[10] = \"LISTEN\";\n  @tcp_states[11] = \"CLOSING\";\n  @tcp_states[12] = \"NEW_SYN_RECV\";\n}\n\ntracepoint:skb:kfree_skb\n{\n  $reason = args.reason;\n  $skb = (struct sk_buff *)args.skbaddr;\n  $sk = ((struct sock *) $skb->sk);\n  $inet_family = $sk->__sk_common.skc_family;\n\n  if ($reason > SKB_DROP_REASON_NOT_SPECIFIED &&\n      ($inet_family == AF_INET || $inet_family == AF_INET6)) {\n    if ($inet_family == AF_INET) {\n      $daddr = ntop($sk->__sk_common.skc_daddr);\n      $saddr = ntop($sk->__sk_common.skc_rcv_saddr);\n    } else {\n      $daddr = ntop($sk->__sk_common.skc_v6_daddr.in6_u.u6_addr8);\n      $saddr = ntop($sk->__sk_common.skc_v6_rcv_saddr.in6_u.u6_addr8);\n    }\n    $lport = $sk->__sk_common.skc_num;\n    $dport = $sk->__sk_common.skc_dport;\n\n    // Destination port is big endian, it must be flipped\n    $dport = bswap($dport);\n\n    $state = $sk->__sk_common.skc_state;\n    $statestr = @tcp_states[$state];\n\n    time(\"%H:%M:%S \");\n    printf(\"%-8d %-16s \", pid, comm);\n    printf(\"%39s:%-6d %39s:%-6d %-10s\\n\", $saddr, $lport, $daddr, $dport, $statestr);\n    printf(\"%s\\n\", kstack);\n  }\n}\n\nEND\n{\n  clear(@tcp_states);\n}\n\n```\n",
    "example: Write a BPF code that counts the number of system calls and the number of processes. It also prints the top 10 system call IDs and the top 10 processes at the end.\n\n```\nBEGIN\n{\n\tprintf(\"Counting syscalls... Hit Ctrl-C to end.\\n\");\n\t// ausyscall --dump | awk 'NR > 1 { printf(\"\\t@sysname[%d] = \\\"%s\\\";\\n\", $1, $2); }'\n}\n\ntracepoint:raw_syscalls:sys_enter\n{\n\t@syscall[args.id] = count();\n\t@process[comm] = count();\n}\n\nEND\n{\n\tprintf(\"\\nTop 10 syscalls IDs:\\n\");\n\tprint(@syscall, 10);\n\tclear(@syscall);\n\n\tprintf(\"\\nTop 10 processes:\\n\");\n\tprint(@process, 10);\n\tclear(@process);\n}\n\n```\n",
    "example: Write a BPF code that traces the kernel OOM killer and prints basic details, including the system load averages, providing context on the system state at the time of the OOM.\n\n```\n#ifndef BPFTRACE_HAVE_BTF\n#include <linux/oom.h>\n#endif\n\nBEGIN\n{\n\tprintf(\"Tracing oom_kill_process()... Hit Ctrl-C to end.\\n\");\n}\n\nkprobe:oom_kill_process\n{\n\t$oc = (struct oom_control *)arg0;\n\ttime(\"%H:%M:%S \");\n\tprintf(\"Triggered by PID %d (\\\"%s\\\"), \", pid, comm);\n\tprintf(\"OOM kill of PID %d (\\\"%s\\\"), %d pages, loadavg: \",\n\t    $oc->chosen->pid, $oc->chosen->comm, $oc->totalpages);\n\tcat(\"/proc/loadavg\");\n}\n\n```\n",
    "example: Write a BPF code that traces the TCP SYN backlog size and creates a histogram of the backlog sizes, also indicating if any SYN packets are being dropped.\n\n```\n#ifndef BPFTRACE_HAVE_BTF\n#include <net/sock.h>\n#endif\n\nBEGIN\n{\n\tprintf(\"Tracing SYN backlog size. Ctrl-C to end.\\n\");\n}\n\nkprobe:tcp_v4_syn_recv_sock,\nkprobe:tcp_v6_syn_recv_sock\n{\n\t$sock = (struct sock *)arg0;\n\t@backlog[$sock->sk_max_ack_backlog & 0xffffffff] =\n\t    hist($sock->sk_ack_backlog);\n\tif ($sock->sk_ack_backlog > $sock->sk_max_ack_backlog) {\n\t\ttime(\"%H:%M:%S dropping a SYN.\\n\");\n\t}\n}\n\nEND\n{\n\tprintf(\"\\n@backlog[backlog limit]: histogram of backlog size\\n\");\n}\n\n```\n",
    "example: Write a BPF code that traces TCP session lifespans and prints details of the connections, including the process ID, command, local and remote addresses and ports, and data transmission statistics.\n\n```\n#ifndef BPFTRACE_HAVE_BTF\n#include <net/tcp_states.h>\n#include <net/sock.h>\n#include <linux/socket.h>\n#include <linux/tcp.h>\n#else\n#include <sys/socket.h>\n#endif\n\nBEGIN\n{\n\tprintf(\"%-5s %-10s %-15s %-5s %-15s %-5s \", \"PID\", \"COMM\",\n\t    \"LADDR\", \"LPORT\", \"RADDR\", \"RPORT\");\n\tprintf(\"%5s %5s %s\\n\", \"TX_KB\", \"RX_KB\", \"MS\");\n}\n\nkprobe:tcp_set_state\n{\n\t$sk = (struct sock *)arg0;\n\t$newstate = arg1;\n\n\t\n\n\t// record first timestamp seen for this socket\n\tif ($newstate < TCP_FIN_WAIT1 && @birth[$sk] == 0) {\n\t\t@birth[$sk] = nsecs;\n\t}\n\n\t// record PID & comm on SYN_SENT\n\tif ($newstate == TCP_SYN_SENT || $newstate == TCP_LAST_ACK) {\n\t\t@skpid[$sk] = pid;\n\t\t@skcomm[$sk] = comm;\n\t}\n\n\t// session ended: calculate lifespan and print\n\tif ($newstate == TCP_CLOSE && @birth[$sk]) {\n\t\t$delta_ms = (nsecs - @birth[$sk]) / 1e6;\n\t\t$lport = $sk->__sk_common.skc_num;\n\t\t$dport = $sk->__sk_common.skc_dport;\n\t\t$dport = bswap($dport);\n\t\t$tp = (struct tcp_sock *)$sk;\n\t\t$pid = @skpid[$sk];\n\t\t$comm = @skcomm[$sk];\n\t\tif ($comm == \"\") {\n\t\t\t// not cached, use current task\n\t\t\t$pid = pid;\n\t\t\t$comm = comm;\n\t\t}\n\n\t\t$family = $sk->__sk_common.skc_family;\n\t\t$saddr = ntop(0);\n\t\t$daddr = ntop(0);\n\t\tif ($family == AF_INET) {\n\t\t\t$saddr = ntop(AF_INET, $sk->__sk_common.skc_rcv_saddr);\n\t\t\t$daddr = ntop(AF_INET, $sk->__sk_common.skc_daddr);\n\t\t} else {\n\t\t\t// AF_INET6\n\t\t\t$saddr = ntop(AF_INET6,\n\t\t\t    $sk->__sk_common.skc_v6_rcv_saddr.in6_u.u6_addr8);\n\t\t\t$daddr = ntop(AF_INET6,\n\t\t\t    $sk->__sk_common.skc_v6_daddr.in6_u.u6_addr8);\n\t\t}\n\t\tprintf(\"%-5d %-10.10s %-15s %-5d %-15s %-6d \", $pid,\n\t\t    $comm, $saddr, $lport, $daddr, $dport);\n\t\tprintf(\"%5d %5d %d\\n\", $tp->bytes_acked / 1024,\n\t\t    $tp->bytes_received / 1024, $delta_ms);\n\n\t\tdelete(@birth[$sk]);\n\t\tdelete(@skpid[$sk]);\n\t\tdelete(@skcomm[$sk]);\n\t}\n}\n\nEND\n{\n\tclear(@birth); clear(@skpid); clear(@skcomm);\n}\n\n```\n",
    "example: Write a BPF code that traces the readline function in the /bin/bash program and prints the timestamp, process ID, and command entered by the user.\n\n```\nBEGIN\n{\n\tprintf(\"Tracing bash commands... Hit Ctrl-C to end.\\n\");\n\tprintf(\"%-9s %-6s %s\\n\", \"TIME\", \"PID\", \"COMMAND\");\n}\n\nuretprobe:/bin/bash:readline\n{\n\ttime(\"%H:%M:%S  \");\n\tprintf(\"%-6d %s\\n\", pid, str(retval));\n}\n\n```\n",
    "example: Write a BPF code that calculates and samples the length of the CPU scheduler run queue as a histogram, subtracting the currently running task from the total queue length.\n\n```\n#ifndef BPFTRACE_HAVE_BTF\n#include <linux/sched.h>\n\n// Until BTF is available, we'll need to declare some of this struct manually,\n// since it isn't available to be #included. This will need maintenance to match\n// your kernel version. It is from kernel/sched/sched.h:\nstruct cfs_rq {\n\tstruct load_weight load;\n\tunsigned long runnable_weight;\n\tunsigned int nr_running;\n\tunsigned int h_nr_running;\n};\n#endif\n\nBEGIN\n{\n\tprintf(\"Sampling run queue length at 99 Hertz... Hit Ctrl-C to end.\\n\");\n}\n\nprofile:hz:99\n{\n\t$task = (struct task_struct *)curtask;\n\t$my_q = (struct cfs_rq *)$task->se.cfs_rq;\n\t$len = $my_q->nr_running;\n\t$len = $len > 0 ? $len - 1 : 0;\t// subtract currently running task\n\t@runqlen = lhist($len, 0, 100, 1);\n}\n\n```\n",
    "example: Write a BPF code that traces and counts TCP retransmits on a Linux system using dynamic tracing of kernel functions. The code prints information about the time, process ID, local and remote address, port, and state of each TCP retransmit.\n\n```\n#ifndef BPFTRACE_HAVE_BTF\n#include <linux/socket.h>\n#include <net/sock.h>\n#else\n#include <sys/socket.h>\n#endif\n\nBEGIN\n{\n\tprintf(\"Tracing tcp retransmits. Hit Ctrl-C to end.\\n\");\n\tprintf(\"%-8s %-8s %20s %21s %6s\\n\", \"TIME\", \"PID\", \"LADDR:LPORT\",\n\t    \"RADDR:RPORT\", \"STATE\");\n\n\t// See include/net/tcp_states.h:\n\t@tcp_states[1] = \"ESTABLISHED\";\n\t@tcp_states[2] = \"SYN_SENT\";\n\t@tcp_states[3] = \"SYN_RECV\";\n\t@tcp_states[4] = \"FIN_WAIT1\";\n\t@tcp_states[5] = \"FIN_WAIT2\";\n\t@tcp_states[6] = \"TIME_WAIT\";\n\t@tcp_states[7] = \"CLOSE\";\n\t@tcp_states[8] = \"CLOSE_WAIT\";\n\t@tcp_states[9] = \"LAST_ACK\";\n\t@tcp_states[10] = \"LISTEN\";\n\t@tcp_states[11] = \"CLOSING\";\n\t@tcp_states[12] = \"NEW_SYN_RECV\";\n}\n\nkprobe:tcp_retransmit_skb\n{\n\t$sk = (struct sock *)arg0;\n\t$inet_family = $sk->__sk_common.skc_family;\n\n\tif ($inet_family == AF_INET || $inet_family == AF_INET6) {\n\t\t// initialize variable type:\n\t\t$daddr = ntop(0);\n\t\t$saddr = ntop(0);\n\t\tif ($inet_family == AF_INET) {\n\t\t\t$daddr = ntop($sk->__sk_common.skc_daddr);\n\t\t\t$saddr = ntop($sk->__sk_common.skc_rcv_saddr);\n\t\t} else {\n\t\t\t$daddr = ntop(\n\t\t\t    $sk->__sk_common.skc_v6_daddr.in6_u.u6_addr8);\n\t\t\t$saddr = ntop(\n\t\t\t    $sk->__sk_common.skc_v6_rcv_saddr.in6_u.u6_addr8);\n\t\t}\n\t\t$lport = $sk->__sk_common.skc_num;\n\t\t$dport = $sk->__sk_common.skc_dport;\n\n\t\t// Destination port is big endian, it must be flipped\n\t\t$dport = bswap($dport);\n\n\t\t$state = $sk->__sk_common.skc_state;\n\t\t$statestr = @tcp_states[$state];\n\n\t\ttime(\"%H:%M:%S \");\n\t\tprintf(\"%-8d %14s:%-6d %14s:%-6d %6s\\n\", pid, $saddr, $lport,\n\t\t    $daddr, $dport, $statestr);\n\t}\n}\n\nEND\n{\n\tclear(@tcp_states);\n}\n\n```\n",
    "example: Write a BPF code that traces VFS calls and counts the number of times each function is called in the kernel.\n\n```\nBEGIN\n{\n\tprintf(\"Tracing VFS calls... Hit Ctrl-C to end.\\n\");\n\n}\n\nkprobe:vfs_*\n{\n\t@[func] = count();\n}\n\n```\n",
    "example: Write a BPF code that traces the syscalls statfs(), statx(), newstat(), and newlstat(), providing information about the PID, process name, error code, and path being accessed.\n\n```\nBEGIN\n{\n\tprintf(\"Tracing stat syscalls... Hit Ctrl-C to end.\\n\");\n\tprintf(\"%-6s %-16s %3s %s\\n\", \"PID\", \"COMM\", \"ERR\", \"PATH\");\n}\n\ntracepoint:syscalls:sys_enter_statfs\n{\n\t@filename[tid] = args.pathname;\n}\n\ntracepoint:syscalls:sys_enter_statx,\ntracepoint:syscalls:sys_enter_newstat,\ntracepoint:syscalls:sys_enter_newlstat\n{\n\t@filename[tid] = args.filename;\n}\n\ntracepoint:syscalls:sys_exit_statfs,\ntracepoint:syscalls:sys_exit_statx,\ntracepoint:syscalls:sys_exit_newstat,\ntracepoint:syscalls:sys_exit_newlstat\n/@filename[tid]/\n{\n\t$ret = args.ret;\n\t$errno = $ret >= 0 ? 0 : - $ret;\n\n\tprintf(\"%-6d %-16s %3d %s\\n\", pid, comm, $errno,\n\t    str(@filename[tid]));\n\tdelete(@filename[tid]);\n}\n\nEND\n{\n\tclear(@filename);\n}\n\n```\n",
    "example: Write a BPF code that traces md flush events and displays the time, process ID, command, and device information of each event.\n\n```\n#ifndef BPFTRACE_HAVE_BTF\n#include <linux/genhd.h>\n#include <linux/bio.h>\n#endif\n\nBEGIN\n{\n\tprintf(\"Tracing md flush events... Hit Ctrl-C to end.\\n\");\n\tprintf(\"%-8s %-6s %-16s %s\\n\", \"TIME\", \"PID\", \"COMM\", \"DEVICE\");\n}\n\nkprobe:md_flush_request\n{\n\ttime(\"%H:%M:%S \");\n\tprintf(\"%-6d %-16s %s\\n\", pid, comm,\n\t    ((struct bio *)arg1)->bi_bdev->bd_disk->disk_name);\n}\n\n```\n",
    "example: Write a BPF code that traces key VFS calls, counts the number of times each call is invoked, and prints a per-second summary.\n\n```\nBEGIN\n{\n\tprintf(\"Tracing key VFS calls... Hit Ctrl-C to end.\\n\");\n\n}\n\nkprobe:vfs_read*,\nkprobe:vfs_write*,\nkprobe:vfs_fsync,\nkprobe:vfs