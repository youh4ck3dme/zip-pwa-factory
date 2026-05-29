#!/usr/bin/env bash
set -e

# farby pre krajsi vystup
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}======================================================${NC}"
echo -e "${YELLOW}   Silk Road Pipeline - Production Stack E2E Test     ${NC}"
echo -e "${YELLOW}======================================================${NC}\n"

# 1. Validacia .env suborov (Staticka analyza)
echo -e "${GREEN}[1/4] Validacia .env suborov a docker-compose.prod.yml...${NC}"

if [ ! -f ".env.production" ]; then
    echo -e "${RED}Chyba: subor .env.production neexistuje.${NC}"
    exit 1
fi

if [ ! -f ".env.production.example" ]; then
    echo -e "${RED}Chyba: subor .env.production.example neexistuje.${NC}"
    exit 1
fi

# Ziska kluce z docker-compose.prod.yml (format ${KLUC} alebo ${KLUC:-default})
REQUIRED_VARS=$(grep -oE '\$\{([A-Za-z0-9_]+)' docker-compose.prod.yml | sed 's/${//' | sort | uniq)

MISSING_VARS=0
for var in $REQUIRED_VARS; do
    if ! grep -q "^$var=" .env.production; then
        echo -e "${RED}Chyba: Premenna $var chyba v .env.production (vyzadovana v docker-compose.prod.yml).${NC}"
        MISSING_VARS=1
    fi
done

if [ $MISSING_VARS -eq 1 ]; then
    echo -e "${RED}Staticka analyza zlyhala. Oprav chybajuce premenne.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Vsetky premenne pouzite v docker-compose su definovane v .env.production.${NC}"

# Porovnanie s .env.production.example
EXAMPLE_VARS=$(grep -v '^#' .env.production.example | grep -v '^\s*$' | cut -d '=' -f 1)
for var in $EXAMPLE_VARS; do
    if ! grep -q "^$var=" .env.production; then
        echo -e "${RED}Chyba: Premenna $var (zadefinovana v .env.production.example) chyba v .env.production.${NC}"
        MISSING_VARS=1
    fi
done

if [ $MISSING_VARS -eq 1 ]; then
    echo -e "${RED}Staticka analyza zlyhala na .env.production.example. Oprav chybajuce premenne.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Vsetky premenne z .env.production.example sa nachadzaju v .env.production.${NC}\n"

# 2. Testovanie Docker Stacku
echo -e "${GREEN}[2/4] Startovanie Docker Stacku (Smoke Test)...${NC}"

# Vytvorime kopiu do .env aby to docker compose zobral defaultne
cp .env.production .env

# Funkcia na upratanie pri ukonceni (aj pri chybe)
cleanup() {
    echo -e "\n${YELLOW}[4/4] Cleanup - vypinanie docker kontajnerov...${NC}"
    docker compose -f docker-compose.prod.yml down -v --remove-orphans > /dev/null 2>&1 || true
    rm -f .env
    echo -e "${GREEN}✓ Prostredie bolo upratane.${NC}"
}
trap cleanup EXIT

echo "Spustam kontajnery (tento krok moze trvat, ak sa builduje frontend)..."
docker compose -f docker-compose.prod.yml up -d

echo "Cakam na inicializaciu sluzieb (30 sekund)..."
sleep 30

# Kontrola stavu kontajnerov
CONTAINERS=$(docker compose -f docker-compose.prod.yml ps -q)
if [ -z "$CONTAINERS" ]; then
    echo -e "${RED}Ziadne kontajnery nebezia!${NC}"
    exit 1
fi

FAILED_CONTAINERS=0
for container in $CONTAINERS; do
    STATUS=$(docker inspect --format='{{.State.Status}}' $container)
    NAME=$(docker inspect --format='{{.Name}}' $container | sed 's/\///')
    
    if [ "$STATUS" != "running" ]; then
        echo -e "${RED}Kontajner $NAME zlyhal! (Stav: $STATUS)${NC}"
        docker logs $NAME | tail -n 20
        FAILED_CONTAINERS=1
    else
        echo -e "${GREEN}✓ $NAME bezi.${NC}"
    fi
done

if [ $FAILED_CONTAINERS -eq 1 ]; then
    echo -e "${RED}Smoke test zlyhal. Niektore kontajnery nebezia.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Vsetky kontajnery bezia.${NC}\n"

# 3. E2E API Validacia nastaveni
echo -e "${GREEN}[3/4] E2E API Validacia nastaveni cez Kong Gateway...${NC}"

# 3a. Test Kong Gateway
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000 || echo "000")
if [ "$HTTP_STATUS" == "000" ]; then
    echo -e "${RED}Kong Gateway neodpoveda na porte 8000!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Kong Gateway funguje (port 8000).${NC}"

# 3b. Test GoTrue (Auth) a Google external providers
echo "Ziskavam nastavenia auth (GoTrue)..."
AUTH_SETTINGS=$(curl -s http://localhost:8000/auth/v1/settings || echo "{}")

if echo "$AUTH_SETTINGS" | grep -q "external"; then
    echo -e "${GREEN}✓ GoTrue API dostupne.${NC}"
    
    # Check if google is enabled in settings
    if echo "$AUTH_SETTINGS" | grep -q '"google":true'; then
        echo -e "${GREEN}✓ Google Sign-In je povolene v Auth sluzbe.${NC}"
    else
        echo -e "${RED}Chyba: Google Sign-In nie je povolene v odpovedi GoTrue /settings!${NC}"
        echo "Odpoved Auth sluzby:"
        echo "$AUTH_SETTINGS"
        exit 1
    fi
else
    echo -e "${RED}Chyba: GoTrue /settings nevracia spravny JSON s external providermi!${NC}"
    echo "Odpoved: $AUTH_SETTINGS"
    exit 1
fi

# 3c. Test PostgREST (DB)
source .env.production
if [ -z "$ANON_KEY" ]; then
    echo -e "${RED}Chyba: ANON_KEY chyba v env na test PostgREST!${NC}"
    exit 1
fi

# Skusime precitat nejaku public rutu (aj ked je prazdna, mala by vratit 200 alebo [] ak funguje db a rest)
REST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "apikey: $ANON_KEY" http://localhost:8000/rest/v1/ || echo "000")
if [ "$REST_STATUS" == "200" ]; then
    echo -e "${GREEN}✓ PostgREST API odpoveda na validny ANON_KEY (HTTP 200).${NC}"
else
    echo -e "${RED}Chyba: PostgREST neodpoveda spravne. HTTP Kod: $REST_STATUS${NC}"
    exit 1
fi

echo -e "\n${YELLOW}======================================================${NC}"
echo -e "${GREEN}   VSETKY TESTY USPESNE PRESLI! DOCKER STACK JE READY.  ${NC}"
echo -e "${YELLOW}======================================================${NC}"

# Krok 4 (Cleanup) sa vykona automaticky cez trap
