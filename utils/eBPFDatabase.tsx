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
    "example: Write a BPF code that traces key VFS calls, counts the number of times each call is invoked, and prints a per-second summary.\n\n```\nBEGIN\n{\n\tprintf(\"Tracing key VFS calls... Hit Ctrl-C to end.\\n\");\n\n}\n\nkprobe:vfs_read*,\nkprobe:vfs_write*,\nkprobe:vfs_fsync,\nkprobe:vfs_open,\nkprobe:vfs_create\n{\n\t@[func] = count();\n}\n\ninterval:s:1\n{\n\ttime();\n\tprint(@);\n\tclear(@);\n}\n\nEND\n{\n\tclear(@);\n}\n\n```\n",
    "example: Write a BPF code that traces new processes and counts the number of new process creations per second using the eBPF technology.\n\n```\nBEGIN\n{\n\tprintf(\"Tracing new processes... Hit Ctrl-C to end.\\n\");\n\n}\n\ntracepoint:sched:sched_process_fork\n{\n\t@ = count();\n}\n\ninterval:s:1\n{\n\ttime(\"%H:%M:%S PIDs/sec: \");\n\tprint(@);\n\tclear(@);\n}\n\nEND\n{\n\tclear(@);\n}\n\n```\n",
    "example: Write a BPF code that monitors the swapins by process.\n\n```\nkprobe:swap_readpage\n{\n        @[comm, pid] = count();\n}\n\ninterval:s:1\n{\n        time();\n        print(@);\n        clear(@);\n}\n\n```\n",
    "example: Write a BPF code that traces TCP connections by dynamically tracing kernel functions and prints out the time, PID, and addresses and ports of the source and destination of each connection.\n\n```\n#ifndef BPFTRACE_HAVE_BTF\n#include <linux/socket.h>\n#include <net/sock.h>\n#else\n#include <sys/socket.h>\n#endif\n\nBEGIN\n{\n  printf(\"Tracing tcp connections. Hit Ctrl-C to end.\\n\");\n  printf(\"%-8s %-8s %-16s \", \"TIME\", \"PID\", \"COMM\");\n  printf(\"%-39s %-6s %-39s %-6s\\n\", \"SADDR\", \"SPORT\", \"DADDR\", \"DPORT\");\n}\n\nkprobe:tcp_connect\n{\n  $sk = ((struct sock *) arg0);\n  $inet_family = $sk->__sk_common.skc_family;\n\n  if ($inet_family == AF_INET || $inet_family == AF_INET6) {\n    if ($inet_family == AF_INET) {\n      $daddr = ntop($sk->__sk_common.skc_daddr);\n      $saddr = ntop($sk->__sk_common.skc_rcv_saddr);\n    } else {\n      $daddr = ntop($sk->__sk_common.skc_v6_daddr.in6_u.u6_addr8);\n      $saddr = ntop($sk->__sk_common.skc_v6_rcv_saddr.in6_u.u6_addr8);\n    }\n    $lport = $sk->__sk_common.skc_num;\n    $dport = $sk->__sk_common.skc_dport;\n\n    // Destination port is big endian, it must be flipped\n    $dport = bswap($dport);\n\n    time(\"%H:%M:%S \");\n    printf(\"%-8d %-16s \", pid, comm);\n    printf(\"%-39s %-6d %-39s %-6d\\n\", $saddr, $lport, $daddr, $dport);\n  }\n}\n\n```\n",
    "example: Write a BPF code that traces gethostbyname[2] calls and provides information about their latency, including the timestamp, process ID, command name, latency in milliseconds, and host name.\n\n```\nBEGIN\n{\n\tprintf(\"Tracing getaddr/gethost calls... Hit Ctrl-C to end.\\n\");\n\tprintf(\"%-9s %-6s %-16s %6s %s\\n\", \"TIME\", \"PID\", \"COMM\", \"LATms\",\n\t    \"HOST\");\n}\n\nuprobe:libc:getaddrinfo,\nuprobe:libc:gethostbyname,\nuprobe:libc:gethostbyname2\n{\n\t@start[tid] = nsecs;\n\t@name[tid] = arg0;\n}\n\nuretprobe:libc:getaddrinfo,\nuretprobe:libc:gethostbyname,\nuretprobe:libc:gethostbyname2\n/@start[tid]/\n{\n\t$latms = (nsecs - @start[tid]) / 1e6;\n\ttime(\"%H:%M:%S  \");\n\tprintf(\"%-6d %-16s %6d %s\\n\", pid, comm, $latms, str(@name[tid]));\n\tdelete(@start[tid]);\n\tdelete(@name[tid]);\n}\n\n```\n",
    "example: Write a BPF code that traces SSL/TLS handshake for OpenSSL, showing handshake latency statistics and distribution. The code captures function calls and their corresponding latencies, and provides a summary of the latency distribution in microseconds.\n\n```\n#!/usr/bin/bpftrace\n\n\nBEGIN\n{\n\tprintf(\"Tracing SSL/TLS handshake... Hit Ctrl-C to end.\\n\");\n}\n\nuprobe:libssl:SSL_read,\nuprobe:libssl:SSL_write,\nuprobe:libssl:SSL_do_handshake\n{\n\t@start_ssl[tid] = nsecs;\n\t@func_ssl[tid] = func; // store for uretprobe\n}\n\nuretprobe:libssl:SSL_read,\nuretprobe:libssl:SSL_write,\nuretprobe:libssl:SSL_do_handshake\n/@start_ssl[tid] != 0/\n{\n\t$lat_us = (nsecs - @start_ssl[tid]) / 1000;\n\tif ((int8)retval >= 1) {\n\t\t@hist[@func_ssl[tid]] = lhist($lat_us, 0, 1000, 200);\n\t\t@stat[@func_ssl[tid]] = stats($lat_us);\n\t} else {\n\t\t@histF[@func_ssl[tid]] = lhist($lat_us, 0, 1000, 200);\n\t\t@statF[@func_ssl[tid]] = stats($lat_us);\n\t}\n\tdelete(@start_ssl[tid]); delete(@func_ssl[tid]);\n}\n\n// need debug symbol for ossl local functions\nuprobe:libcrypto:rsa_ossl_public_encrypt,\nuprobe:libcrypto:rsa_ossl_public_decrypt,\nuprobe:libcrypto:rsa_ossl_private_encrypt,\nuprobe:libcrypto:rsa_ossl_private_decrypt,\nuprobe:libcrypto:RSA_sign,\nuprobe:libcrypto:RSA_verify,\nuprobe:libcrypto:ossl_ecdsa_sign,\nuprobe:libcrypto:ossl_ecdsa_verify,\nuprobe:libcrypto:ecdh_simple_compute_key\n{\n\t@start_crypto[tid] = nsecs;\n\t@func_crypto[tid] = func; // store for uretprobe\n}\n\nuretprobe:libcrypto:rsa_ossl_public_encrypt,\nuretprobe:libcrypto:rsa_ossl_public_decrypt,\nuretprobe:libcrypto:rsa_ossl_private_encrypt,\nuretprobe:libcrypto:rsa_ossl_private_decrypt,\nuretprobe:libcrypto:RSA_sign,\nuretprobe:libcrypto:RSA_verify,\nuretprobe:libcrypto:ossl_ecdsa_sign,\nuretprobe:libcrypto:ossl_ecdsa_verify,\nuretprobe:libcrypto:ecdh_simple_compute_key\n/@start_crypto[tid] != 0/\n{\n\t$lat_us = (nsecs - @start_crypto[tid]) / 1000;\n\t@hist[@func_crypto[tid]] = lhist($lat_us, 0, 1000, 200);\n\t@stat[@func_crypto[tid]] = stats($lat_us);\n\tdelete(@start_crypto[tid]); delete(@func_crypto[tid]);\n}\n\nEND\n{\n\tprintf(\"\\nLatency distribution in microsecond:\");\n}\n\n```\n",
    "example: Write a BPF code that traces the security capability checks (cap_capable()) and prints the UID, PID, command name, capability, capability name, and audit value for each syscall in a clear and organized manner.\n\n```\nBEGIN\n{\n\tprintf(\"Tracing cap_capable syscalls... Hit Ctrl-C to end.\\n\");\n\tprintf(\"%-9s %-6s %-6s %-16s %-4s %-20s AUDIT\\n\", \"TIME\", \"UID\", \"PID\",\n\t    \"COMM\", \"CAP\", \"NAME\");\n\t@cap[0] = \"CAP_CHOWN\";\n\t@cap[1] = \"CAP_DAC_OVERRIDE\";\n\t@cap[2] = \"CAP_DAC_READ_SEARCH\";\n\t@cap[3] = \"CAP_FOWNER\";\n\t@cap[4] = \"CAP_FSETID\";\n\t@cap[5] = \"CAP_KILL\";\n\t@cap[6] = \"CAP_SETGID\";\n\t@cap[7] = \"CAP_SETUID\";\n\t@cap[8] = \"CAP_SETPCAP\";\n\t@cap[9] = \"CAP_LINUX_IMMUTABLE\";\n\t@cap[10] = \"CAP_NET_BIND_SERVICE\";\n\t@cap[11] = \"CAP_NET_BROADCAST\";\n\t@cap[12] = \"CAP_NET_ADMIN\";\n\t@cap[13] = \"CAP_NET_RAW\";\n\t@cap[14] = \"CAP_IPC_LOCK\";\n\t@cap[15] = \"CAP_IPC_OWNER\";\n\t@cap[16] = \"CAP_SYS_MODULE\";\n\t@cap[17] = \"CAP_SYS_RAWIO\";\n\t@cap[18] = \"CAP_SYS_CHROOT\";\n\t@cap[19] = \"CAP_SYS_PTRACE\";\n\t@cap[20] = \"CAP_SYS_PACCT\";\n\t@cap[21] = \"CAP_SYS_ADMIN\";\n\t@cap[22] = \"CAP_SYS_BOOT\";\n\t@cap[23] = \"CAP_SYS_NICE\";\n\t@cap[24] = \"CAP_SYS_RESOURCE\";\n\t@cap[25] = \"CAP_SYS_TIME\";\n\t@cap[26] = \"CAP_SYS_TTY_CONFIG\";\n\t@cap[27] = \"CAP_MKNOD\";\n\t@cap[28] = \"CAP_LEASE\";\n\t@cap[29] = \"CAP_AUDIT_WRITE\";\n\t@cap[30] = \"CAP_AUDIT_CONTROL\";\n\t@cap[31] = \"CAP_SETFCAP\";\n\t@cap[32] = \"CAP_MAC_OVERRIDE\";\n\t@cap[33] = \"CAP_MAC_ADMIN\";\n\t@cap[34] = \"CAP_SYSLOG\";\n\t@cap[35] = \"CAP_WAKE_ALARM\";\n\t@cap[36] = \"CAP_BLOCK_SUSPEND\";\n\t@cap[37] = \"CAP_AUDIT_READ\";\n\t@cap[38] = \"CAP_PERFMON\";\n\t@cap[39] = \"CAP_BPF\";\n\t@cap[40] = \"CAP_CHECKPOINT_RESTORE\";\n}\n\nkprobe:cap_capable\n{\n\t$cap = arg2;\n\t$audit = arg3;\n\ttime(\"%H:%M:%S  \");\n\tprintf(\"%-6d %-6d %-16s %-4d %-20s %d\\n\", uid, pid, comm, $cap,\n\t    @cap[$cap], $audit);\n}\n\nEND\n{\n\tclear(@cap);\n}\n\n```\n",
    "example: Write a BPF code that traces new processes created via the exec() system call, providing the timestamp, process ID, and arguments of the executed command.\n\n```\nBEGIN\n{\n\tprintf(\"%-10s %-5s %s\\n\", \"TIME(ms)\", \"PID\", \"ARGS\");\n}\n\ntracepoint:syscalls:sys_enter_exec*\n{\n\tprintf(\"%-10u %-5d \", elapsed / 1e6, pid);\n\tjoin(args.argv);\n}\n\n```\n",
    "example: Write a BPF code that traces block device I/O latency by calculating the time difference between the start and completion of I/O operations and storing them in a histogram.\n\n```\nBEGIN\n{\n\tprintf(\"Tracing block device I/O... Hit Ctrl-C to end.\\n\");\n}\n\nkprobe:blk_account_io_start,\nkprobe:__blk_account_io_start\n{\n\t@start[arg0] = nsecs;\n}\n\nkprobe:blk_account_io_done,\nkprobe:__blk_account_io_done\n/@start[arg0]/\n{\n\t@usecs = hist((nsecs - @start[arg0]) / 1000);\n\tdelete(@start[arg0]);\n}\n\nEND\n{\n\tclear(@start);\n}\n\n```\n",
    "example: Write a BPF code that traces the CPU scheduler and records the latency of tasks in the run queue, using the sched_wakeup, sched_wakeup_new, and sched_switch tracepoints, and displays the latency as a histogram.\n\n```\n#include <linux/sched.h>\n\nBEGIN\n{\n\tprintf(\"Tracing CPU scheduler... Hit Ctrl-C to end.\\n\");\n}\n\ntracepoint:sched:sched_wakeup,\ntracepoint:sched:sched_wakeup_new\n{\n\t@qtime[args.pid] = nsecs;\n}\n\ntracepoint:sched:sched_switch\n{\n\tif (args.prev_state == TASK_RUNNING) {\n\t\t@qtime[args.prev_pid] = nsecs;\n\t}\n\n\t$ns = @qtime[args.next_pid];\n\tif ($ns) {\n\t\t@usecs = hist((nsecs - $ns) / 1000);\n\t}\n\tdelete(@qtime[args.next_pid]);\n}\n\nEND\n{\n\tclear(@qtime);\n}\n\n```\n",
    "example: Write a BPF code that traces voluntary sleep calls, printing the time, parent process ID (PPID), parent process command (PCOMM), process ID (PID), process command (COMM), and duration in seconds.\n\n```\n#ifndef BPFTRACE_HAVE_BTF\n#include <linux/time.h>\n#include <linux/sched.h>\n#endif\n\nBEGIN\n{\n\tprintf(\"Tracing sleeps. Hit Ctrl-C to end.\\n\");\n\tprintf(\"%-8s %-6s %-16s %-6s %-16s %s\\n\", \"TIME\", \"PPID\", \"PCOMM\",\n\t    \"PID\", \"COMM\", \"SECONDS\");\n}\n\ntracepoint:syscalls:sys_enter_nanosleep\n/args.rqtp->tv_sec + args.rqtp->tv_nsec/\n{\n\t$task = (struct task_struct *)curtask;\n\ttime(\"%H:%M:%S \");\n\tprintf(\"%-6d %-16s %-6d %-16s %d.%03d\\n\", $task->real_parent->pid,\n\t    $task->real_parent->comm, pid, comm,\n\t    args.rqtp->tv_sec, (uint64)args.rqtp->tv_nsec / 1e6);\n}\n\n```\n",
    "example: Write a BPF code that traces block I/O and measures the latency by initializing stacks, using kprobes and histogram.\n\n```\nBEGIN\n{\n\tprintf(\"Tracing block I/O with init stacks. Hit Ctrl-C to end.\\n\");\n}\n\nkprobe:blk_account_io_start,\nkprobe:__blk_account_io_start\n{\n\t@reqstack[arg0] = kstack;\n\t@reqts[arg0] = nsecs;\n}\n\nkprobe:blk_start_request,\nkprobe:blk_mq_start_request\n/@reqts[arg0]/\n{\n\t@usecs[@reqstack[arg0]] = hist(nsecs - @reqts[arg0]);\n\tdelete(@reqstack[arg0]);\n\tdelete(@reqts[arg0]);\n}\n\nEND\n{\n\tclear(@reqstack); clear(@reqts);\n}\n\n```\n",
    "example: Write a BPF code that traces open() and openat() syscalls, displaying the process ID, command name, file descriptor, error code, and file path.\n\n```\nBEGIN\n{\n\tprintf(\"Tracing open syscalls... Hit Ctrl-C to end.\\n\");\n\tprintf(\"%-6s %-16s %4s %3s %s\\n\", \"PID\", \"COMM\", \"FD\", \"ERR\", \"PATH\");\n}\n\ntracepoint:syscalls:sys_enter_open,\ntracepoint:syscalls:sys_enter_openat\n{\n\t@filename[tid] = args.filename;\n}\n\ntracepoint:syscalls:sys_exit_open,\ntracepoint:syscalls:sys_exit_openat\n/@filename[tid]/\n{\n\t$ret = args.ret;\n\t$fd = $ret >= 0 ? $ret : -1;\n\t$errno = $ret >= 0 ? 0 : - $ret;\n\n\tprintf(\"%-6d %-16s %4d %3d %s\\n\", pid, comm, $fd, $errno,\n\t    str(@filename[tid]));\n\tdelete(@filename[tid]);\n}\n\nEND\n{\n\tclear(@filename);\n}\n\n```\n",
    "example: Write a BPF code that traces the setuid syscall and its related syscalls, and prints out information about the process ID, command name, UID, syscall type, and arguments for each syscall.\n\n```\nBEGIN\n{\n\tprintf(\"Tracing setuid(2) family syscalls. Hit Ctrl-C to end.\\n\");\n\tprintf(\"%-8s %-6s %-16s %-6s %-9s %s\\n\", \"TIME\",\n\t    \"PID\", \"COMM\", \"UID\", \"SYSCALL\", \"ARGS (RET)\");\n}\n\ntracepoint:syscalls:sys_enter_setuid,\ntracepoint:syscalls:sys_enter_setfsuid\n{\n\t@uid[tid] = uid;\n\t@setuid[tid] = args.uid;\n\t@seen[tid] = 1;\n}\n\ntracepoint:syscalls:sys_enter_setresuid\n{\n\t@uid[tid] = uid;\n\t@ruid[tid] = args.ruid;\n\t@euid[tid] = args.euid;\n\t@suid[tid] = args.suid;\n\t@seen[tid] = 1;\n}\n\ntracepoint:syscalls:sys_exit_setuid\n/@seen[tid]/\n{\n\ttime(\"%H:%M:%S \");\n\tprintf(\"%-6d %-16s %-6d setuid    uid=%d (%d)\\n\", pid, comm,\n\t    @uid[tid], @setuid[tid], args.ret);\n\tdelete(@seen[tid]); delete(@uid[tid]); delete(@setuid[tid]);\n}\n\ntracepoint:syscalls:sys_exit_setfsuid\n/@seen[tid]/\n{\n\ttime(\"%H:%M:%S \");\n\tprintf(\"%-6d %-16s %-6d setfsuid  uid=%d (prevuid=%d)\\n\", pid, comm,\n\t    @uid[tid], @setuid[tid], args.ret);\n\tdelete(@seen[tid]); delete(@uid[tid]); delete(@setuid[tid]);\n}\n\ntracepoint:syscalls:sys_exit_setresuid\n/@seen[tid]/\n{\n\ttime(\"%H:%M:%S \");\n\tprintf(\"%-6d %-16s %-6d setresuid \", pid, comm, @uid[tid]);\n\tprintf(\"ruid=%d euid=%d suid=%d (%d)\\n\", @ruid[tid], @euid[tid],\n\t    @suid[tid], args.ret);\n\tdelete(@seen[tid]); delete(@uid[tid]); delete(@ruid[tid]);\n\tdelete(@euid[tid]); delete(@suid[tid]);\n}\n\n```\n",
    "example: Write a BPF code that samples the CPU usage of processes at a rate of 99Hz and outputs the histogram of CPU usage for each process identified by its PID.\n\n```\nBEGIN\n{\n\tprintf(\"Sampling CPU at 99hz... Hit Ctrl-C to end.\\n\");\n}\n\nprofile:hz:99\n/pid/\n{\n\t@cpu = lhist(cpu, 0, 1000, 1);\n}\n\n```\n",
    "example: Write a BPF code that traces sync-related system calls, such as sync(), syncfs(), fsync(), and fdatasync(), and prints the time, process ID, command, and event for each traced system call.\n\n```\nBEGIN\n{\n\tprintf(\"Tracing sync syscalls... Hit Ctrl-C to end.\\n\");\n\tprintf(\"%-9s %-6s %-16s %s\\n\", \"TIME\", \"PID\", \"COMM\", \"EVENT\");\n}\n\ntracepoint:syscalls:sys_enter_sync,\ntracepoint:syscalls:sys_enter_syncfs,\ntracepoint:syscalls:sys_enter_fsync,\ntracepoint:syscalls:sys_enter_fdatasync,\ntracepoint:syscalls:sys_enter_sync_file_range*,\ntracepoint:syscalls:sys_enter_msync\n{\n\ttime(\"%H:%M:%S  \");\n\tprintf(\"%-6d %-16s %s\\n\", pid, comm, probe);\n}\n\n```\n",
    "example: Write a BPF code that traces the receiving of UNIX domain socket packages, displaying the time, process information, size, and data of each package.\n\n```\n  bpftrace\n\n#ifndef BPFTRACE_HAVE_BTF\n#include <linux/skbuff.h>\n#endif\n\nBEGIN\n{\n\tprintf(\"Dump UNIX socket packages RX. Ctrl-C to end\\n\");\n\tprintf(\"%-8s %-16s %-8s %-8s %-s\\n\", \"TIME\", \"COMM\", \"PID\", \"SIZE\", \"DATA\");\n}\n\nkprobe:unix_stream_read_actor\n{\n\t$skb = (struct sk_buff *)arg0;\n\ttime(\"%H:%M:%S \");\n\tprintf(\"%-16s %-8d %-8d %r\\n\", comm, pid, $skb->len, buf($skb->data, $skb->len));\n}\n\nEND\n{\n}\n\n```\n",
    "example: Write a BPF code that fetches and prints the load averages from the kernel, similar to the output of the 'uptime' command but with three decimal places instead of two.\n\n```\nBEGIN\n{\n\tprintf(\"Reading load averages... Hit Ctrl-C to end.\\n\");\n}\n\ninterval:s:1\n{\n\t\n\t$avenrun = kaddr(\"avenrun\");\n\t$load1 = *$avenrun;\n\t$load5 = *($avenrun + 8);\n\t$load15 = *($avenrun + 16);\n\ttime(\"%H:%M:%S \");\n\tprintf(\"load averages: %d.%03d %d.%03d %d.%03d\\n\",\n\t    ($load1 >> 11), (($load1 & ((1 << 11) - 1)) * 1000) >> 11,\n\t    ($load5 >> 11), (($load5 & ((1 << 11) - 1)) * 1000) >> 11,\n\t    ($load15 >> 11), (($load15 & ((1 << 11) - 1)) * 1000) >> 11\n\t);\n}\n\n```\n",
    "exa