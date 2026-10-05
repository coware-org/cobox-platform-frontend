# Roles con Auth0

La autorización por rol se resuelve a partir de un claim de Auth0, no desde la
base de datos de IAM ni desde la Management API. Este documento describe el
contrato del claim y la configuración del tenant que hay que aplicar a mano.

## Claim de roles

El claim vive en el espacio de nombres `https://cobox/roles` y es una lista de
cadenas. Los valores llevan el prefijo `ROLE_`:

| Valor del claim | Significado |
| --- | --- |
| `ROLE_MANAGER` | Acceso al panel de gestión |
| `ROLE_DRIVER` | Acceso al panel de conductor |
| `ROLE_CLIENT` | Sin acceso operativo |

El catálogo es **cerrado**. `normalizeRole` normaliza el valor (mayúsculas,
espacios y prefijos `ROLE_` repetidos, como `ROLE_ROLE_MANAGER`) y después lo
busca en el catálogo: si no aparece, devuelve `null` y el rol se descarta. Un
rol desconocido no se propaga, no se renombra y no produce error.

## Dónde se consume

El claim se lee en los dos tokens, y cada capa lee el suyo:

| Capa | Token | Consumidor |
| --- | --- | --- |
| Frontend | ID token | `useCoboxRoles()` y `RoleGuard` |
| Backend | Access token | `CoboxJwtAuthenticationConverter` |

Los dos tokens deben llevar el claim. Si solo lo lleva el ID token, el frontend
muestra la sección pero el backend responde 403; si solo lleva el access token,
ocurre lo contrario. Es la causa más habitual de desacuerdo entre capas.

El frontend lee `useAuth0().user` (`Auth0ProviderWithNavigate` pide
`openid profile email`), nunca el access token.

## Configuración del tenant (manual, solo dashboard)

Nada de esto se puede expresar desde el repositorio. Son pasos del dashboard de
Auth0 y quedan fuera de la revisión de código.

1. **Crear los roles** `ROLE_MANAGER`, `ROLE_DRIVER` y `ROLE_CLIENT` en el
   tenant, con ese nombre exacto. `normalizeRole` conserva las mayúsculas, así
   que `role_manager` o `Role_Manager` no coinciden con el catálogo.
2. **API `https://api.coboxsv.dev`**: activar **RBAC** y fijar **Token
   Dialect** en *Add Permissions in the Access Token*. Sin RBAC el access token
   no transporta los roles y `CoboxJwtAuthenticationConverter` no encuentra nada.
3. **Acción *Post User Registration*** que asigne `ROLE_MANAGER` mediante
   `api.user.addRoles`. El registro por su cuenta no asigna nada: la Acción
   *Add Custom Claim* que ya existe **solo replica** los roles que el usuario ya
   tiene, nunca los asigna. Sin este paso el usuario se registra sin roles y
   entra en 403.
4. **Acción *Post Login*** que escriba el claim en los dos tokens, con
   `api.idToken.setCustomClaim` **y** `api.accessToken.setCustomClaim`. El
   espacio de nombres y la clave deben coincidir con `ROLES_CLAIM`
   (`https://cobox/roles`).
5. **Desplegar las Actions y confirmar que están enlazadas a su disparador.**
   Una Action sin desplegar no hace nada en silencio y no devuelve ningún error,
   así que el síntoma es siempre «los roles no llegan» sin causa aparente.

## Backfill

Las Actions no se aplican retroactivamente. Un usuario registrado antes de
existir el paso 3 conserva la sesión y los tokens sin rol: seguirá recibiendo 403
hasta que se le asigne el rol a mano o se vuelva aemitir su token. Al dar de
alta la configuración hay que reasignar el rol a los usuarios existentes.

## Divergencia conocida

`iam-service` persiste `ROLE_CLIENT` en su propia base de datos, mientras que el
token puede no llevarlo. En ese caso la insignia de rol del perfil muestra
*Cliente* y el `RoleGuard` denies el acceso al mismo tiempo. La insignia es
informativa y no participa en la autorización: cuando discrepan, manda el token.

## Verificación

1. Iniciar sesión en el entorno conectado.
2. Decodificar el ID token y el access token (por ejemplo en
   [jwt.io](https://jwt.io)) y comprobar que `https://cobox/roles` aparece en los
   dos, con los valores con prefijo `ROLE_`.
3. Si solo aparece en uno, la Acción *Post Login* está escribiendo el claim en un
   solo token (paso 4).
4. Si no aparece en ninguno, la Acción no está desplegada o no está enlazada a
   su disparador (paso 5).
5. Cerrar sesión y volver a entrar: los claims solo se reevalúan en el login, no
   en la lectura de la sesión cacheada.

Las pruebas del repositorio no contactan con el tenant de Auth0. Cubren la
normalización, el descarte de roles fuera de catálogo y el orden del catálogo
con identidades ficticias.

```sh
npm test
npx tsc -b --noEmit
npx eslint src/app/auth tests/roles.test.ts
```

## Ficheros relacionados

| Fichero | Contenido |
| --- | --- |
| `src/app/auth/roles.ts` | Claim, catálogo cerrado, normalización y `useCoboxRoles()` |
| `src/app/auth/RoleGuard.tsx` | Guardia de autorización y panel 403 |
| `docs/auth0-user-profile.md` | Identidad del usuario en la barra superior y `/profile` |