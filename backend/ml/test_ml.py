from ml.feature_extractor import FeatureExtractor

extractor = FeatureExtractor()

packet = {

    "packet_size":1500,

    "source_port":50000,

    "destination_port":443,

    "protocol":"TCP",

    "ip_version":"IPv4"

}

print(extractor.extract(packet))