"""
Registra un modelo 3D en la app, de punta a punta.

Sube el .glb a Supabase con un nombre estable (el sistema de anclas del visor
se indexa por ese nombre), lo inscribe en plant_models y opcionalmente crea una
planta de prueba en una cuenta para poder verlo en la app sin escanear nada.

Se ejecuta DENTRO del contenedor del backend, que es donde viven las
credenciales de Supabase. La carpeta scripts/ no esta montada en la imagen,
asi que el script y el modelo se copian a /tmp:

    docker cp scripts/add_plant_model.py plantcare-backend:/tmp/
    docker cp modelo.glb plantcare-backend:/tmp/x.glb
    docker exec -i plantcare-backend python3 /tmp/add_plant_model.py \
        --file /tmp/x.glb --slug monstera_default --type Monstera \
        --name "Monstera" --demo-user 206
"""
import argparse
import asyncio
import sys

sys.path.insert(0, "/app")

from app.api.core.supabase_storage import init_supabase, get_public_url  # noqa: E402
from app.api.core.database import get_db  # noqa: E402


def upload(path: str, slug: str) -> str:
    """Sube el .glb con nombre fijo (upsert) y devuelve su URL pública."""
    client = init_supabase(force_reinit=True)
    remote = f"3d_models/{slug}.glb"
    with open(path, "rb") as fh:
        data = fh.read()
    client.storage.from_("plantcare").upload(
        remote, data, {"content-type": "model/gltf-binary", "upsert": "true"}
    )
    # get_public_url a veces devuelve la URL con "?" al final
    return get_public_url(remote).rstrip("?")


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", required=True, help="Ruta del .glb dentro del contenedor")
    ap.add_argument("--slug", required=True, help="Nombre estable, ej: monstera_default")
    ap.add_argument("--type", required=True, help="plant_type normalizado, ej: Monstera")
    ap.add_argument("--name", required=True, help="Nombre visible del modelo")
    ap.add_argument("--demo-user", type=int, help="Crear planta de prueba para este user_id")
    ap.add_argument("--demo-name", help="Nombre de la planta de prueba")
    args = ap.parse_args()

    url = upload(args.file, args.slug)
    print(f"subido: {url}")

    db = await get_db()

    # Un solo modelo por tipo queda como default, para que el matching no sea ambiguo
    await db.execute_query(
        "UPDATE plant_models SET is_default = FALSE WHERE plant_type = %s", (args.type,)
    )
    row = await db.execute_query(
        "INSERT INTO plant_models (plant_type, name, model_3d_url, is_default, metadata) "
        "VALUES (%s, %s, %s, TRUE, %s) RETURNING id",
        (args.type, args.name, url, '{"scale": 1.0, "source": "meshy"}'),
    )
    model_id = int(row.iloc[0]["id"])
    print(f"plant_models id={model_id} tipo={args.type}")

    if args.demo_user:
        plant_name = args.demo_name or args.name
        prow = await db.execute_query(
            "INSERT INTO plants (user_id, plant_name, plant_type, character_mood, health_status) "
            "VALUES (%s, %s, %s, 'happy', 'healthy') RETURNING id",
            (args.demo_user, plant_name, args.type),
        )
        plant_id = int(prow.iloc[0]["id"])
        await db.execute_query(
            "INSERT INTO plant_model_assignments (plant_id, model_id) VALUES (%s, %s)",
            (plant_id, model_id),
        )
        print(f"planta de prueba id={plant_id} '{plant_name}' -> modelo {model_id}")

    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
