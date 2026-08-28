module.exports=[427699,(e,t,r)=>{t.exports=e.x("events",()=>require("events"))},446786,(e,t,r)=>{t.exports=e.x("os",()=>require("os"))},870722,(e,t,r)=>{t.exports=e.x("tty",()=>require("tty"))},522734,(e,t,r)=>{t.exports=e.x("fs",()=>require("fs"))},233405,(e,t,r)=>{t.exports=e.x("child_process",()=>require("child_process"))},924868,(e,t,r)=>{t.exports=e.x("fs/promises",()=>require("fs/promises"))},410430,(e,t,r)=>{t.exports=e.x("async_hooks",()=>require("async_hooks"))},254799,(e,t,r)=>{t.exports=e.x("crypto",()=>require("crypto"))},921517,(e,t,r)=>{t.exports=e.x("http",()=>require("http"))},524836,(e,t,r)=>{t.exports=e.x("https",()=>require("https"))},500874,(e,t,r)=>{t.exports=e.x("buffer",()=>require("buffer"))},406461,(e,t,r)=>{t.exports=e.x("zlib",()=>require("zlib"))},193695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},918622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},556704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},832319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},324725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},814747,(e,t,r)=>{t.exports=e.x("path",()=>require("path"))},224361,(e,t,r)=>{t.exports=e.x("util",()=>require("util"))},270406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},296638,e=>{"use strict";function t(e){return e?.trim().toLowerCase()??""}e.s(["isPlatformOwner",0,function(e){let r=t(process.env.PLATFORM_OWNER_EMAIL);return!!r&&t(e)===r},"normalizeEmail",0,t])},138033,e=>{"use strict";e.s(["logAuthDiagnostic",0,function(e){}])},475595,e=>{"use strict";let t=new Map;e.s(["consumeRateLimit",0,function(e,r,a){let s=Date.now(),n=t.get(e);return!n||n.resetAt<=s?(t.set(e,{count:1,resetAt:s+a}),{allowed:!0,retryAfterSeconds:0}):n.count>=r?{allowed:!1,retryAfterSeconds:Math.max(1,Math.ceil((n.resetAt-s)/1e3))}:(n.count+=1,{allowed:!0,retryAfterSeconds:0})}])},129117,748813,417726,e=>{"use strict";var t=e.i(254799),r=e.i(904528),a=e.i(160939);function s(e){return e.normalize("NFKC").replace(/\s+/g," ").trim().slice(0,150)}e.s(["DEFAULT_TOTAL_LIMIT",0,20,"MAX_QUERY_LENGTH",0,150,"MIN_QUERY_LENGTH",0,2,"SEARCH_CONTEXTS",0,["PUBLIC","STUDENT","TEACHER","ADMIN"],"SEARCH_RESULT_TYPES",0,["COURSE","CATEGORY","ACADEMY","LESSON","GRAMMAR_TOPIC","VOCABULARY_TOPIC","HELP_ARTICLE","ASSIGNMENT","GROUP","STUDENT","SUBMISSION","USER_WORD","USER_MISTAKE","ACHIEVEMENT"]],748813),e.s(["normalizeSearchQuery",0,s],417726);let n=null;function i(e){return(0,t.createHash)("sha256").update(e).digest("hex")}function o(e=new Date){return new Date(Date.UTC(e.getUTCFullYear(),e.getUTCMonth(),e.getUTCDate()))}function l(e){return e.toUpperCase()}function u(e){return s(e).toLocaleLowerCase("en")}function c(e){return e instanceof r.Prisma.PrismaClientKnownRequestError&&"P2010"===e.code&&"42P01"===("string"==typeof e.meta?.code?e.meta.code:"")}async function d(){return n||(n=a.prisma.$queryRaw(r.Prisma.sql`
        SELECT
          to_regclass('"SearchHistory"')::text AS "historyTable",
          to_regclass('"SearchQueryMetric"')::text AS "metricTable"
      `).then(e=>!!(e[0]?.historyTable&&e[0]?.metricTable)).catch(()=>!1)),n}async function p(e){if(!await d())return;let s=u(e.query);if(!s)return;let n=i(s),p=l(e.context),h=o();await a.prisma.$transaction([a.prisma.$executeRaw(r.Prisma.sql`
        INSERT INTO "SearchHistory" (
          "id", "userId", "eventType", "query", "normalizedQuery", "queryHash", "context",
          "resultCount", "tookMs", "locale", "ipHash", "userAgent", "createdAt"
        )
        VALUES (
          ${(0,t.randomUUID)()}, ${e.userId??null}, 'QUERY', ${e.query}, ${s}, ${n}, ${p},
          ${Math.max(0,Math.floor(e.resultCount))}, ${Math.max(0,Math.floor(e.tookMs))}, ${e.locale??null},
          ${e.ip?i(e.ip):null}, ${e.userAgent?.slice(0,512)??null}, NOW()
        )
      `),a.prisma.$executeRaw(r.Prisma.sql`
        INSERT INTO "SearchQueryMetric" (
          "id", "day", "context", "queryHash", "totalSearches", "noResultSearches", "totalClicks", "lastResultCount", "createdAt", "updatedAt"
        )
        VALUES (
          ${(0,t.randomUUID)()}, ${h}, ${p}, ${n}, 1,
          ${+(0===e.resultCount)}, 0, ${Math.max(0,Math.floor(e.resultCount))}, NOW(), NOW()
        )
        ON CONFLICT ("day", "context", "queryHash")
        DO UPDATE SET
          "totalSearches" = "SearchQueryMetric"."totalSearches" + 1,
          "noResultSearches" = "SearchQueryMetric"."noResultSearches" + ${+(0===e.resultCount)},
          "lastResultCount" = ${Math.max(0,Math.floor(e.resultCount))},
          "updatedAt" = NOW()
      `)]).catch(e=>{if(!c(e))throw e})}async function h(e){if(!await d())return;let s=u(e.query);if(!s)return;let n=i(s),p=l(e.context),h=o();await a.prisma.$transaction([a.prisma.$executeRaw(r.Prisma.sql`
        INSERT INTO "SearchHistory" (
          "id", "userId", "eventType", "query", "normalizedQuery", "queryHash", "context",
          "resultType", "resultId", "resultUrl", "position", "locale", "ipHash", "userAgent", "createdAt"
        )
        VALUES (
          ${(0,t.randomUUID)()}, ${e.userId??null}, 'CLICK', ${e.query}, ${s}, ${n}, ${p},
          ${e.resultType}, ${e.resultId.slice(0,191)}, ${e.resultUrl.slice(0,512)}, ${Math.max(0,Math.floor(e.position))},
          ${e.locale??null}, ${e.ip?i(e.ip):null}, ${e.userAgent?.slice(0,512)??null}, NOW()
        )
      `),a.prisma.$executeRaw(r.Prisma.sql`
        INSERT INTO "SearchQueryMetric" (
          "id", "day", "context", "queryHash", "totalSearches", "noResultSearches", "totalClicks", "lastResultCount", "createdAt", "updatedAt"
        )
        VALUES (
          ${(0,t.randomUUID)()}, ${h}, ${p}, ${n}, 0, 0, 1, 0, NOW(), NOW()
        )
        ON CONFLICT ("day", "context", "queryHash")
        DO UPDATE SET
          "totalClicks" = "SearchQueryMetric"."totalClicks" + 1,
          "updatedAt" = NOW()
      `)]).catch(e=>{if(!c(e))throw e})}async function S(e){let t=Math.max(0,Math.floor(e.cursor??0)),s=Math.min(100,Math.max(1,Math.floor(e.limit??20)));if(!await d())return{items:[],total:0,cursor:t,nextCursor:null};try{let n=[r.Prisma.sql`"userId" = ${e.userId}`];e.context&&n.push(r.Prisma.sql`"context" = ${l(e.context)}`),e.eventType&&n.push(r.Prisma.sql`"eventType" = ${e.eventType}`);let i=r.Prisma.sql`WHERE ${r.Prisma.join(n," AND ")}`,[o]=await a.prisma.$queryRaw(r.Prisma.sql`
        SELECT COUNT(*)::int AS count
        FROM "SearchHistory"
        ${i}
      `),u=await a.prisma.$queryRaw(r.Prisma.sql`
        SELECT
          "id",
          "eventType",
          "query",
          "context",
          "resultCount",
          "resultType",
          "resultId",
          "resultUrl",
          "position",
          "createdAt"
        FROM "SearchHistory"
        ${i}
        ORDER BY "createdAt" DESC
        LIMIT ${s}
        OFFSET ${t}
      `),c=Number(o?.count??0);return{items:u,total:c,cursor:t,nextCursor:t+s<c?t+s:null}}catch(e){if(c(e))return{items:[],total:0,cursor:t,nextCursor:null};throw e}}async function y(e){let t=Math.min(365,Math.max(1,Math.floor(e?.days??30)));if(!await d())return{periodDays:t,totals:{totalSearches:0,totalClicks:0,noResultSearches:0,clickThroughRate:0,noResultRate:0},byContext:[],daily:[],topQueries:[]};let s=o(new Date(Date.now()-(t-1)*864e5)),n=e?.context?l(e.context):null,i=n?r.Prisma.sql`AND "context" = ${n}`:r.Prisma.empty,u=n?r.Prisma.sql`AND "context" = ${n}`:r.Prisma.empty;try{let[e]=await a.prisma.$queryRaw(r.Prisma.sql`
      SELECT
        COALESCE(SUM("totalSearches"), 0)::int AS "totalSearches",
        COALESCE(SUM("noResultSearches"), 0)::int AS "noResultSearches",
        COALESCE(SUM("totalClicks"), 0)::int AS "totalClicks"
      FROM "SearchQueryMetric"
      WHERE "day" >= ${s}
      ${i}
    `),n=await a.prisma.$queryRaw(r.Prisma.sql`
      SELECT
        "context",
        COALESCE(SUM("totalSearches"), 0)::int AS "totalSearches",
        COALESCE(SUM("noResultSearches"), 0)::int AS "noResultSearches",
        COALESCE(SUM("totalClicks"), 0)::int AS "totalClicks"
      FROM "SearchQueryMetric"
      WHERE "day" >= ${s}
      ${i}
      GROUP BY "context"
      ORDER BY "totalSearches" DESC
    `),o=await a.prisma.$queryRaw(r.Prisma.sql`
      SELECT
        "day",
        COALESCE(SUM("totalSearches"), 0)::int AS "totalSearches",
        COALESCE(SUM("totalClicks"), 0)::int AS "totalClicks",
        COALESCE(SUM("noResultSearches"), 0)::int AS "noResultSearches"
      FROM "SearchQueryMetric"
      WHERE "day" >= ${s}
      ${i}
      GROUP BY "day"
      ORDER BY "day" ASC
    `),l=await a.prisma.$queryRaw(r.Prisma.sql`
      SELECT
        "queryHash",
        COALESCE(SUM("totalSearches"), 0)::int AS searches,
        COALESCE(SUM("totalClicks"), 0)::int AS clicks,
        COALESCE(SUM("noResultSearches"), 0)::int AS "noResults"
      FROM "SearchQueryMetric"
      WHERE "day" >= ${s}
      ${i}
      GROUP BY "queryHash"
      ORDER BY searches DESC, clicks DESC
      LIMIT 10
    `),c=await a.prisma.$queryRaw(r.Prisma.sql`
        SELECT
          "queryHash",
          "normalizedQuery",
          COUNT(*)::int AS samples
        FROM "SearchHistory"
        WHERE "createdAt" >= ${s}
          AND "eventType" = 'QUERY'
          ${u}
        GROUP BY "queryHash", "normalizedQuery"
        ORDER BY samples DESC
      `),d=new Map;for(let e of c){let t=d.get(e.queryHash);(!t||e.samples>t.samples)&&d.set(e.queryHash,{normalizedQuery:e.normalizedQuery,samples:e.samples})}let p=Number(e?.totalSearches??0),h=Number(e?.totalClicks??0),S=Number(e?.noResultSearches??0);return{periodDays:t,totals:{totalSearches:p,totalClicks:h,noResultSearches:S,clickThroughRate:p?Math.round(h/p*1e3)/10:0,noResultRate:p?Math.round(S/p*1e3)/10:0},byContext:n.map(e=>({...e,clickThroughRate:e.totalSearches?Math.round(e.totalClicks/e.totalSearches*1e3)/10:0,noResultRate:e.totalSearches?Math.round(e.noResultSearches/e.totalSearches*1e3)/10:0})),daily:o,topQueries:l.map(e=>{let t=d.get(e.queryHash),r=t&&t.samples>=3?t.normalizedQuery:null;return{...e,query:r,sampleCount:t?.samples??0}})}}catch(e){if(c(e))return{periodDays:t,totals:{totalSearches:0,totalClicks:0,noResultSearches:0,clickThroughRate:0,noResultRate:0},byContext:[],daily:[],topQueries:[]};throw e}}async function R(e){let t=await y(e);return{generatedAt:new Date().toISOString(),periodDays:t.periodDays,totals:t.totals,byContext:t.byContext,daily:t.daily,topQueries:t.topQueries}}async function m(e){let t=Math.min(1095,Math.max(30,Math.floor(e?.retentionDays??180))),s=e?.dryRun??!1;if(!await d())return{retentionDays:t,dryRun:s,deletedHistoryRows:0,deletedMetricRows:0};let n=new Date(Date.now()-864e5*t),i=o(n),[l]=await a.prisma.$queryRaw(r.Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "SearchHistory"
      WHERE "createdAt" < ${n}
    `),[u]=await a.prisma.$queryRaw(r.Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "SearchQueryMetric"
      WHERE "day" < ${i}
    `),c=Number(l?.count??0),p=Number(u?.count??0);return s||await a.prisma.$transaction([a.prisma.$executeRaw(r.Prisma.sql`
          DELETE FROM "SearchHistory"
          WHERE "createdAt" < ${n}
        `),a.prisma.$executeRaw(r.Prisma.sql`
          DELETE FROM "SearchQueryMetric"
          WHERE "day" < ${i}
        `)]),{retentionDays:t,dryRun:s,deletedHistoryRows:c,deletedMetricRows:p}}e.s(["cleanupSearchHistory",0,m,"getSearchAnalyticsExport",0,R,"getSearchAnalyticsSummary",0,y,"listUserSearchHistory",0,S,"recordSearchQuery",0,p,"recordSearchResultClick",0,h],129117)},279219,e=>{"use strict";var t=e.i(254799);e.s(["hashPassword",0,function(e){let r=(0,t.randomBytes)(16).toString("hex"),a=(0,t.scryptSync)(e,r,64).toString("hex");return`scrypt$${r}$${a}`},"passwordNeedsRehash",0,function(e){return!e.startsWith("scrypt$")},"verifyPassword",0,function(e,r){let[a,s,n]=r.split("$");if("scrypt"===a&&s&&n){let r=(0,t.scryptSync)(e,s,64).toString("hex"),a=Buffer.from(n,"hex"),i=Buffer.from(r,"hex");return a.length===i.length&&(0,t.timingSafeEqual)(a,i)}let[i,o]=r.split(":");if(!i||!o)return r===e||(0,t.createHash)("sha256").update(e).digest("hex")===r;let l=(0,t.createHash)("sha256").update(`${i}:${e}`).digest("hex"),u=Buffer.from(o,"hex"),c=Buffer.from(l,"hex");return u.length===c.length&&(0,t.timingSafeEqual)(u,c)}])},393152,e=>{"use strict";let t=/%(2f|5c)/i,r="/dashboard";function a(e,s=r){if(!e||!e.startsWith("/")||e.startsWith("//")||e.includes("\\")||t.test(e))return s;try{let t=new URL(e,"https://krin.invalid");return"https://krin.invalid"===t.origin?`${t.pathname}${t.search}${t.hash}`:s}catch{return s}}function s(e,t,n=r){let i=new URL(t),o=a(n),l=new URL(o,i).toString();try{let t=new URL(e??o,i);if(t.origin!==i.origin)return l;return new URL(a(`${t.pathname}${t.search}${t.hash}`,o),i).toString()}catch{return l}}e.s(["getSafeInternalPath",0,a,"getSafePostAuthRedirectUrl",0,function(e,t){let r=s("/auth/complete",t),a=s(e,t,"/auth/complete"),n=new URL(a);return"/"===n.pathname||"/login"===n.pathname||"/register"===n.pathname||n.pathname.startsWith("/api/auth/")?r:a}])},792509,(e,t,r)=>{t.exports=e.x("url",()=>require("url"))},449719,(e,t,r)=>{t.exports=e.x("assert",()=>require("assert"))},145706,(e,t,r)=>{t.exports=e.x("querystring",()=>require("querystring"))},513925,e=>{"use strict";var t=e.i(160939),r=e.i(757660),a=e.i(430273),s=e.i(419808);async function n(){let e=await (0,s.requireAuth)();if(e)return e.user;let n=await (0,r.getServerSession)(a.nextAuthOptions),i=n?.user.id;if(!i)return null;let o=await t.prisma.user.findUnique({where:{id:i},select:s.AUTHENTICATED_USER_SELECT});return!o||o.deletedAt||o.isBlocked?null:o}e.s(["getCurrentUser",0,n])},221791,e=>{"use strict";var t=e.i(747909),r=e.i(174017),a=e.i(996250),s=e.i(759756),n=e.i(561916),i=e.i(174677),o=e.i(869741),l=e.i(316795),u=e.i(487718),c=e.i(995169),d=e.i(47587),p=e.i(666012),h=e.i(570101),S=e.i(626937),y=e.i(10372),R=e.i(193695);e.i(820232);var m=e.i(600220),E=e.i(89171),x=e.i(513925),C=e.i(475595),f=e.i(748813),A=e.i(417726),w=e.i(129117);function T(e){return e.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||e.headers.get("x-real-ip")||"anonymous"}async function g(e){try{var t,r;let a=await (0,x.getCurrentUser)(),s=(0,C.consumeRateLimit)(a?.id?`search-click:user:${a.id}`:`search-click:ip:${T(e)}`,a?240:120,6e4);if(!s.allowed)return E.NextResponse.json({error:"Too many requests",retryAfter:s.retryAfterSeconds},{status:429});let n=await e.json().catch(()=>null),i=(0,A.normalizeSearchQuery)(String(n?.query??"")),o=(t=n?.context,"string"==typeof t&&f.SEARCH_CONTEXTS.includes(t)?t:"PUBLIC"),l=(r=n?.resultType,"string"!=typeof r?null:f.SEARCH_RESULT_TYPES.includes(r)?r:null),u="string"==typeof n?.resultId?n.resultId.trim():"",c="string"==typeof n?.resultUrl?n.resultUrl.trim():"",d=Number(n?.position??-1),p=Number.isFinite(d)?Math.max(0,Math.floor(d)):-1;if(!i||!l||!u||!c||p<0)return E.NextResponse.json({error:"Invalid payload"},{status:400});return await (0,w.recordSearchResultClick)({query:i,context:o,resultType:l,resultId:u,resultUrl:c,position:p,locale:a?.interfaceLanguage??null,userId:a?.id??null,ip:T(e),userAgent:e.headers.get("user-agent")}).catch(()=>{console.warn("search_click_analytics_persist_failed")}),new E.NextResponse(null,{status:204})}catch{return E.NextResponse.json({error:"Unable to persist click"},{status:500})}}e.s(["POST",0,g,"runtime",0,"nodejs"],769100);var $=e.i(769100);let q=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/search/click/route",pathname:"/api/search/click",filename:"route",bundlePath:""},distDir:".next-translation-build",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/search/click/route.ts",nextConfigOutput:"",userland:$,...{}}),{workAsyncStorage:M,workUnitAsyncStorage:O,serverHooks:U}=q;async function N(e,t,a){a.requestMeta&&(0,s.setRequestMeta)(e,a.requestMeta),q.isDev&&(0,s.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let E="/api/search/click/route";E=E.replace(/\/index$/,"")||"/";let x=await q.prepare(e,t,{srcPage:E,multiZoneDraftMode:!1});if(!x)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:C,deploymentId:f,params:A,nextConfig:w,parsedUrl:T,isDraftMode:g,prerenderManifest:$,routerServerContext:M,isOnDemandRevalidate:O,revalidateOnlyGenerated:U,resolvedPathname:N,clientReferenceManifest:v,serverActionsManifest:P}=x,H=(0,o.normalizeAppPath)(E),I=!!($.dynamicRoutes[H]||$.routes[N]),L=async()=>((null==M?void 0:M.render404)?await M.render404(e,t,T,!1):t.end("This page could not be found"),null);if(I&&!g){let e=!!$.routes[N],t=$.dynamicRoutes[H];if(t&&!1===t.fallback&&!e){if(w.adapterPath)return await L();throw new R.NoFallbackError}}let D=null;!I||q.isDev||g||(D="/index"===(D=N)?"/":D);let k=!0===q.isDev||!I,b=I&&!k;P&&v&&(0,i.setManifestsSingleton)({page:E,clientReferenceManifest:v,serverActionsManifest:P});let _=e.method||"GET",Q=(0,n.getTracer)(),F=Q.getActiveScopeSpan(),W=!!(null==M?void 0:M.isWrappedByNextServer),B=!!(0,s.getRequestMeta)(e,"minimalMode"),j=(0,s.getRequestMeta)(e,"incrementalCache")||await q.getIncrementalCache(e,w,$,B);null==j||j.resetRequestCache(),globalThis.__incrementalCache=j;let Y={params:A,previewProps:$.preview,renderOpts:{experimental:{authInterrupts:!!w.experimental.authInterrupts},cacheComponents:!!w.cacheComponents,supportsDynamicResponse:k,incrementalCache:j,cacheLifeProfiles:w.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,s)=>q.onRequestError(e,t,a,s,M)},sharedContext:{buildId:C,deploymentId:f}},z=new l.NodeNextRequest(e),G=new l.NodeNextResponse(t),K=u.NextRequestAdapter.fromNodeNextRequest(z,(0,u.signalFromNodeResponse)(t));try{let s,i=async e=>q.handle(K,Y).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=Q.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==c.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${_} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t),s&&s!==e&&(s.setAttribute("http.route",a),s.updateName(t))}else e.updateName(`${_} ${E}`)}),o=async s=>{var n,o;let l=async({previousCacheEntry:r})=>{try{if(!B&&O&&U&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await i(s);e.fetchMetrics=Y.renderOpts.fetchMetrics;let o=Y.renderOpts.pendingWaitUntil;o&&a.waitUntil&&(a.waitUntil(o),o=void 0);let l=Y.renderOpts.collectedTags;if(!I)return await (0,p.sendResponse)(z,G,n,Y.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,h.toNodeOutgoingHttpHeaders)(n.headers);l&&(t[y.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==Y.renderOpts.collectedRevalidate&&!(Y.renderOpts.collectedRevalidate>=y.INFINITE_CACHE)&&Y.renderOpts.collectedRevalidate,a=void 0===Y.renderOpts.collectedExpire||Y.renderOpts.collectedExpire>=y.INFINITE_CACHE?void 0:Y.renderOpts.collectedExpire;return{value:{kind:m.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await q.onRequestError(e,t,{routerKind:"App Router",routePath:E,routeType:"route",revalidateReason:(0,d.getRevalidateReason)({isStaticGeneration:b,isOnDemandRevalidate:O})},!1,M),t}},u=await q.handleResponse({req:e,nextConfig:w,cacheKey:D,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:$,isRoutePPREnabled:!1,isOnDemandRevalidate:O,revalidateOnlyGenerated:U,responseGenerator:l,waitUntil:a.waitUntil,isMinimalMode:B});if(!I)return null;if((null==u||null==(n=u.value)?void 0:n.kind)!==m.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(o=u.value)?void 0:o.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});B||t.setHeader("x-nextjs-cache",O?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),g&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let c=(0,h.fromNodeOutgoingHttpHeaders)(u.value.headers);return B&&I||c.delete(y.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||c.get("Cache-Control")||c.set("Cache-Control",(0,S.getCacheControlHeader)(u.cacheControl)),await (0,p.sendResponse)(z,G,new Response(u.value.body,{headers:c,status:u.value.status||200})),null};W&&F?await o(F):(s=Q.getActiveScopeSpan(),await Q.withPropagatedContext(e.headers,()=>Q.trace(c.BaseServerSpan.handleRequest,{spanName:`${_} ${E}`,kind:n.SpanKind.SERVER,attributes:{"http.method":_,"http.target":e.url}},o),void 0,!W))}catch(t){if(t instanceof R.NoFallbackError||await q.onRequestError(e,t,{routerKind:"App Router",routePath:H,routeType:"route",revalidateReason:(0,d.getRevalidateReason)({isStaticGeneration:b,isOnDemandRevalidate:O})},!1,M),I)throw t;return await (0,p.sendResponse)(z,G,new Response(null,{status:500})),null}}e.s(["handler",0,N,"patchFetch",0,function(){return(0,a.patchFetch)({workAsyncStorage:M,workUnitAsyncStorage:O})},"routeModule",0,q,"serverHooks",0,U,"workAsyncStorage",0,M,"workUnitAsyncStorage",0,O],221791)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0wrwvfa._.js.map