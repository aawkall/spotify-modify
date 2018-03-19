FROM tykio/tyk-gateway

# Config files into /opt/tyk-gateway
COPY config/* /opt/tyk-gateway/

# Endpoint defintions into /opt/tyk-gateway/apps
COPY apps/* /opt/tyk-gateway/apps/

# API files into /opt/tyk-gateway/middleware
COPY middleware/* /opt/tyk-gateway/middleware/
