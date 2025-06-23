#!/usr/bin/expect -f
set timeout 10
set msg_id 0

spawn npx ts-node src/tool_reincarnate.ts
send -- "{\"jsonrpc\": \"2.0\", \"id\": $msg_id, \"method\": \"initialize\", \"params\": {\"protocolVersion\": \"2024-11-05\", \"capabilities\": {}, \"clientInfo\": {\"name\": \"whatever\", \"version\": \"0.0.0\"}}}\r"
expect  {
    -r "\r\n" {puts "Received response to initialize"}
    timeout {
        puts "ERROR: Timeout occurred while waiting for response to initialize"
        exit 1
    }
}
expect "result"

send --  "{\"jsonrpc\":\"2.0\",\"method\":\"notifications/initialized\",\"params\":{}}\r"

puts ""
incr msg_id
send -- "{\"jsonrpc\": \"2.0\", \"id\": $msg_id, \"method\": \"tools/list\", \"params\":{}}\r"
expect  {
    -r "\r\n" {puts "Received response to tools/list"}
    timeout {
        puts "ERROR: Timeout occurred while waiting for tools/list"
        exit 1
    }
}
expect  {
    -r "result" {}
    timeout  {
        puts "ERROR: Timeout occurred while waiting for result in tools/list"
        exit 1
    }
}

puts ""
incr msg_id
send -- "{\"jsonrpc\": \"2.0\", \"id\": $msg_id, \"method\": \"tools/call\", \"params\":{\"name\": \"reincarnate\", \"arguments\": {\"name\": \"Ann\"}}}\r"
expect {
  -r "\r\n" {
    puts "Received response to tools/call"
}
timeout {
        puts "ERROR: Timeout occurred while waiting for response to tools/call"
        exit 1
    }
}
expect "result"

puts ""
incr msg_id
send -- "{\"jsonrpc\": \"2.0\", \"id\": $msg_id, \"method\": \"resources/list\", \"params\":{}}\r"
expect {
    -r "\r\n" {
        puts "Received response to resources/list"
    }
    timeout {
        puts "ERROR: Timeout occurred while waiting for response to resources/list"
        exit 1
    }
}
expect {
    -r "result" {}
    -r "error" {
        puts "ERROR: Received error in response to resources/list"
    }
    timeout {
        puts "ERROR: Timeout occurred while waiting for result in resources/list"
        exit 1
    }
}

puts ""
incr msg_id
send -- "{\"jsonrpc\": \"2.0\", \"id\": $msg_id, \"method\": \"prompts/list\"}\r"
expect {
    -r "\r\n" {
        puts "Received response to prompts/list"
        expect {
            -re "result" {
                puts "Received result in response to prompts/list"
            }
            -re "error" {
                puts "ERROR: Received error in response to prompts/list"
            }
            timeout {
                puts "ERROR: Timeout occurred while waiting for response to prompts/list"
                exit 1
            }
        }
    }
}

puts ""
incr msg_id
send --  "{\"jsonrpc\":\"2.0\", \"id\": $msg_id, \"method\":\"server.shutdown\",\"params\":[]}\r"

exit