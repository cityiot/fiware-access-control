docker network create --driver overlay --scope swarm cityiot

docker stack deploy -c docker-compose-mongo.yml mongo-rs
docker stack deploy -c docker-compose-orion.yml orion
docker stack deploy -c docker-compose-quantumleap.yml ql
docker stack deploy -c docker-compose-accesscontrol.yml access-control
