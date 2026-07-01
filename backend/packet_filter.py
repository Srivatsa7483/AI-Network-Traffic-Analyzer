"""
packet_filter.py

Parses Wireshark-style query syntax and evaluates it against packet dictionaries.
Supported syntax:
- Protocols: tcp, udp, icmp, dns, http, https
- Fields: ip.src == 1.2.3.4, ip.dst == 5.6.7.8
- Port matching: port == 80, source_port == 80, destination_port == 80
- Size matching: length > 100, len < 500
- Operators: ==, !=, >, <, >=, <=, and, or, &&, ||, not, !
"""

import re

class PacketFilter:
    def __init__(self, query_str):
        self.query_str = query_str.strip() if query_str else ""
        self.tokens = self._tokenize(self.query_str)
        self.pos = 0

    def _tokenize(self, s):
        # Match operators, field keys, IPs, numbers, strings
        token_specification = [
            ('LOGICAL',  r'\band\b|\bor\b|&&|\|\|'),
            ('NOT',      r'\bnot\b|!'),
            ('COMP',     r'==|!=|>=|<=|>|<'),
            ('LPAREN',   r'\('),
            ('RPAREN',   r'\)'),
            ('FIELD',    r'\bip\.src\b|\bip\.dst\b|\bport\b|\blength\b|\blen\b|\bprotocol\b'),
            ('PROTO',    r'\btcp\b|\budp\b|\bicmp\b|\bdns\b|\bhttp\b|\bhttps\b'),
            ('VAL_IP',   r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b'),
            ('VAL_NUM',  r'\b\d+\b'),
            ('WS',       r'\s+'),
            ('MISC',     r'[a-zA-Z_0-9\.\-\:\/]+'),
        ]
        tok_regex = '|'.join('(?P<%s>%s)' % pair for pair in token_specification)
        tokens = []
        for mo in re.finditer(tok_regex, s, re.IGNORECASE):
            kind = mo.lastgroup
            value = mo.group()
            if kind == 'WS':
                continue
            tokens.append((kind, value))
        return tokens

    def evaluate(self, packet):
        """
        Evaluate the parsed query against a packet dict.
        """
        if not self.query_str:
            return True
        
        self.pos = 0
        try:
            val = self._parse_expression(packet)
            return val
        except Exception as e:
            # If parsing fails, fall back to simple string search in the packet info
            q = self.query_str.lower()
            return (
                q in str(packet.get("source_ip", "")).lower() or
                q in str(packet.get("destination_ip", "")).lower() or
                q in str(packet.get("protocol", "")).lower() or
                q in str(packet.get("info", "")).lower()
            )

    def _parse_expression(self, packet):
        # Logical OR level
        left = self._parse_and_expression(packet)
        while self.pos < len(self.tokens) and self.tokens[self.pos][0] == 'LOGICAL' and self.tokens[self.pos][1].lower() in ['or', '||']:
            self.pos += 1  # consume 'or'
            right = self._parse_and_expression(packet)
            left = left or right
        return left

    def _parse_and_expression(self, packet):
        # Logical AND level
        left = self._parse_primary(packet)
        while self.pos < len(self.tokens) and self.tokens[self.pos][0] == 'LOGICAL' and self.tokens[self.pos][1].lower() in ['and', '&&']:
            self.pos += 1  # consume 'and'
            right = self._parse_primary(packet)
            left = left and right
        return left

    def _parse_primary(self, packet):
        if self.pos >= len(self.tokens):
            return True

        tok_type, tok_val = self.tokens[self.pos]

        if tok_type == 'NOT':
            self.pos += 1
            return not self._parse_primary(packet)

        if tok_type == 'LPAREN':
            self.pos += 1  # consume '('
            val = self._parse_expression(packet)
            if self.pos < len(self.tokens) and self.tokens[self.pos][0] == 'RPAREN':
                self.pos += 1  # consume ')'
            return val

        if tok_type == 'PROTO':
            self.pos += 1
            proto = tok_val.upper()
            packet_proto = str(packet.get("protocol", "")).upper()
            info = str(packet.get("info", "")).upper()
            
            if proto == 'TCP':
                return packet_proto == 'TCP'
            elif proto == 'UDP':
                return packet_proto == 'UDP'
            elif proto == 'ICMP':
                return packet_proto == 'ICMP'
            elif proto == 'DNS':
                return 'DNS' in info or packet.get("source_port") == 53 or packet.get("destination_port") == 53
            elif proto == 'HTTP':
                return 'HTTP' in info or packet.get("source_port") in [80, 8080] or packet.get("destination_port") in [80, 8080]
            elif proto == 'HTTPS':
                return 'TLS' in info or 'SSL' in info or packet.get("source_port") == 443 or packet.get("destination_port") == 443
            return False

        if tok_type == 'FIELD':
            field = tok_val.lower()
            self.pos += 1
            if self.pos >= len(self.tokens) or self.tokens[self.pos][0] != 'COMP':
                raise ValueError("Expected comparison operator")
            
            comp_op = self.tokens[self.pos][1]
            self.pos += 1
            
            if self.pos >= len(self.tokens):
                raise ValueError("Expected value after comparison operator")
            
            val_type, val_str = self.tokens[self.pos]
            self.pos += 1

            # Match and resolve comparison
            pkt_val = None
            if field == 'ip.src':
                pkt_val = packet.get("source_ip")
            elif field == 'ip.dst':
                pkt_val = packet.get("destination_ip")
            elif field == 'port':
                # Match either port
                s_port = packet.get("source_port")
                d_port = packet.get("destination_port")
                try:
                    target_port = int(val_str)
                except ValueError:
                    return False
                if comp_op == '==': return s_port == target_port or d_port == target_port
                elif comp_op == '!=': return s_port != target_port and d_port != target_port
                return False
            elif field in ['length', 'len']:
                pkt_val = packet.get("packet_size")
                val_str = int(val_str)
            elif field == 'protocol':
                pkt_val = packet.get("protocol")

            # Check value mismatch/cast
            if isinstance(pkt_val, int) and not isinstance(val_str, int):
                try:
                    val_str = int(val_str)
                except ValueError:
                    return False

            if pkt_val is None:
                return False

            if comp_op == '==': return pkt_val == val_str
            elif comp_op == '!=': return pkt_val != val_str
            elif comp_op == '>': return pkt_val > val_str
            elif comp_op == '<': return pkt_val < val_str
            elif comp_op == '>=': return pkt_val >= val_str
            elif comp_op == '<=': return pkt_val <= val_str
            return False

        # Fallback/Misc matches string in info or protocol
        self.pos += 1
        return tok_val.lower() in str(packet.get("info", "")).lower() or tok_val.lower() in str(packet.get("protocol", "")).lower()


def filter_packets(packets, query_str):
    """
    Filters a list of packets matching a Wireshark-syntax query.
    """
    if not query_str:
        return packets
    pf = PacketFilter(query_str)
    return [p for p in packets if pf.evaluate(p)]
