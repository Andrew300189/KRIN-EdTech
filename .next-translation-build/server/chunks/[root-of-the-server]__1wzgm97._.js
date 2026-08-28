module.exports=[427699,(e,t,r)=>{t.exports=e.x("events",()=>require("events"))},446786,(e,t,r)=>{t.exports=e.x("os",()=>require("os"))},870722,(e,t,r)=>{t.exports=e.x("tty",()=>require("tty"))},522734,(e,t,r)=>{t.exports=e.x("fs",()=>require("fs"))},233405,(e,t,r)=>{t.exports=e.x("child_process",()=>require("child_process"))},924868,(e,t,r)=>{t.exports=e.x("fs/promises",()=>require("fs/promises"))},410430,(e,t,r)=>{t.exports=e.x("async_hooks",()=>require("async_hooks"))},254799,(e,t,r)=>{t.exports=e.x("crypto",()=>require("crypto"))},921517,(e,t,r)=>{t.exports=e.x("http",()=>require("http"))},524836,(e,t,r)=>{t.exports=e.x("https",()=>require("https"))},500874,(e,t,r)=>{t.exports=e.x("buffer",()=>require("buffer"))},406461,(e,t,r)=>{t.exports=e.x("zlib",()=>require("zlib"))},193695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},918622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},556704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},832319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},324725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},814747,(e,t,r)=>{t.exports=e.x("path",()=>require("path"))},224361,(e,t,r)=>{t.exports=e.x("util",()=>require("util"))},270406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},296638,e=>{"use strict";function t(e){return e?.trim().toLowerCase()??""}e.s(["isPlatformOwner",0,function(e){let r=t(process.env.PLATFORM_OWNER_EMAIL);return!!r&&t(e)===r},"normalizeEmail",0,t])},129117,748813,417726,e=>{"use strict";var t=e.i(254799),r=e.i(904528),a=e.i(160939);function s(e){return e.normalize("NFKC").replace(/\s+/g," ").trim().slice(0,150)}e.s(["DEFAULT_TOTAL_LIMIT",0,20,"MAX_QUERY_LENGTH",0,150,"MIN_QUERY_LENGTH",0,2,"SEARCH_CONTEXTS",0,["PUBLIC","STUDENT","TEACHER","ADMIN"],"SEARCH_RESULT_TYPES",0,["COURSE","CATEGORY","ACADEMY","LESSON","GRAMMAR_TOPIC","VOCABULARY_TOPIC","HELP_ARTICLE","ASSIGNMENT","GROUP","STUDENT","SUBMISSION","USER_WORD","USER_MISTAKE","ACHIEVEMENT"]],748813),e.s(["normalizeSearchQuery",0,s],417726);let n=null;function i(e){return(0,t.createHash)("sha256").update(e).digest("hex")}function o(e=new Date){return new Date(Date.UTC(e.getUTCFullYear(),e.getUTCMonth(),e.getUTCDate()))}function l(e){return e.toUpperCase()}function u(e){return s(e).toLocaleLowerCase("en")}function c(e){return e instanceof r.Prisma.PrismaClientKnownRequestError&&"P2010"===e.code&&"42P01"===("string"==typeof e.meta?.code?e.meta.code:"")}async function p(){return n||(n=a.prisma.$queryRaw(r.Prisma.sql`
        SELECT
          to_regclass('"SearchHistory"')::text AS "historyTable",
          to_regclass('"SearchQueryMetric"')::text AS "metricTable"
      `).then(e=>!!(e[0]?.historyTable&&e[0]?.metricTable)).catch(()=>!1)),n}async function d(e){if(!await p())return;let s=u(e.query);if(!s)return;let n=i(s),d=l(e.context),h=o();await a.prisma.$transaction([a.prisma.$executeRaw(r.Prisma.sql`
        INSERT INTO "SearchHistory" (
          "id", "userId", "eventType", "query", "normalizedQuery", "queryHash", "context",
          "resultCount", "tookMs", "locale", "ipHash", "userAgent", "createdAt"
        )
        VALUES (
          ${(0,t.randomUUID)()}, ${e.userId??null}, 'QUERY', ${e.query}, ${s}, ${n}, ${d},
          ${Math.max(0,Math.floor(e.resultCount))}, ${Math.max(0,Math.floor(e.tookMs))}, ${e.locale??null},
          ${e.ip?i(e.ip):null}, ${e.userAgent?.slice(0,512)??null}, NOW()
        )
      `),a.prisma.$executeRaw(r.Prisma.sql`
        INSERT INTO "SearchQueryMetric" (
          "id", "day", "context", "queryHash", "totalSearches", "noResultSearches", "totalClicks", "lastResultCount", "createdAt", "updatedAt"
        )
        VALUES (
          ${(0,t.randomUUID)()}, ${h}, ${d}, ${n}, 1,
          ${+(0===e.resultCount)}, 0, ${Math.max(0,Math.floor(e.resultCount))}, NOW(), NOW()
        )
        ON CONFLICT ("day", "context", "queryHash")
        DO UPDATE SET
          "totalSearches" = "SearchQueryMetric"."totalSearches" + 1,
          "noResultSearches" = "SearchQueryMetric"."noResultSearches" + ${+(0===e.resultCount)},
          "lastResultCount" = ${Math.max(0,Math.floor(e.resultCount))},
          "updatedAt" = NOW()
      `)]).catch(e=>{if(!c(e))throw e})}async function h(e){if(!await p())return;let s=u(e.query);if(!s)return;let n=i(s),d=l(e.context),h=o();await a.prisma.$transaction([a.prisma.$executeRaw(r.Prisma.sql`
        INSERT INTO "SearchHistory" (
          "id", "userId", "eventType", "query", "normalizedQuery", "queryHash", "context",
          "resultType", "resultId", "resultUrl", "position", "locale", "ipHash", "userAgent", "createdAt"
        )
        VALUES (
          ${(0,t.randomUUID)()}, ${e.userId??null}, 'CLICK', ${e.query}, ${s}, ${n}, ${d},
          ${e.resultType}, ${e.resultId.slice(0,191)}, ${e.resultUrl.slice(0,512)}, ${Math.max(0,Math.floor(e.position))},
          ${e.locale??null}, ${e.ip?i(e.ip):null}, ${e.userAgent?.slice(0,512)??null}, NOW()
        )
      `),a.prisma.$executeRaw(r.Prisma.sql`
        INSERT INTO "SearchQueryMetric" (
          "id", "day", "context", "queryHash", "totalSearches", "noResultSearches", "totalClicks", "lastResultCount", "createdAt", "updatedAt"
        )
        VALUES (
          ${(0,t.randomUUID)()}, ${h}, ${d}, ${n}, 0, 0, 1, 0, NOW(), NOW()
        )
        ON CONFLICT ("day", "context", "queryHash")
        DO UPDATE SET
          "totalClicks" = "SearchQueryMetric"."totalClicks" + 1,
          "updatedAt" = NOW()
      `)]).catch(e=>{if(!c(e))throw e})}async function S(e){let t=Math.max(0,Math.floor(e.cursor??0)),s=Math.min(100,Math.max(1,Math.floor(e.limit??20)));if(!await p())return{items:[],total:0,cursor:t,nextCursor:null};try{let n=[r.Prisma.sql`"userId" = ${e.userId}`];e.context&&n.push(r.Prisma.sql`"context" = ${l(e.context)}`),e.eventType&&n.push(r.Prisma.sql`"eventType" = ${e.eventType}`);let i=r.Prisma.sql`WHERE ${r.Prisma.join(n," AND ")}`,[o]=await a.prisma.$queryRaw(r.Prisma.sql`
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
      `),c=Number(o?.count??0);return{items:u,total:c,cursor:t,nextCursor:t+s<c?t+s:null}}catch(e){if(c(e))return{items:[],total:0,cursor:t,nextCursor:null};throw e}}async function R(e){let t=Math.min(365,Math.max(1,Math.floor(e?.days??30)));if(!await p())return{periodDays:t,totals:{totalSearches:0,totalClicks:0,noResultSearches:0,clickThroughRate:0,noResultRate:0},byContext:[],daily:[],topQueries:[]};let s=o(new Date(Date.now()-(t-1)*864e5)),n=e?.context?l(e.context):null,i=n?r.Prisma.sql`AND "context" = ${n}`:r.Prisma.empty,u=n?r.Prisma.sql`AND "context" = ${n}`:r.Prisma.empty;try{let[e]=await a.prisma.$queryRaw(r.Prisma.sql`
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
      `),p=new Map;for(let e of c){let t=p.get(e.queryHash);(!t||e.samples>t.samples)&&p.set(e.queryHash,{normalizedQuery:e.normalizedQuery,samples:e.samples})}let d=Number(e?.totalSearches??0),h=Number(e?.totalClicks??0),S=Number(e?.noResultSearches??0);return{periodDays:t,totals:{totalSearches:d,totalClicks:h,noResultSearches:S,clickThroughRate:d?Math.round(h/d*1e3)/10:0,noResultRate:d?Math.round(S/d*1e3)/10:0},byContext:n.map(e=>({...e,clickThroughRate:e.totalSearches?Math.round(e.totalClicks/e.totalSearches*1e3)/10:0,noResultRate:e.totalSearches?Math.round(e.noResultSearches/e.totalSearches*1e3)/10:0})),daily:o,topQueries:l.map(e=>{let t=p.get(e.queryHash),r=t&&t.samples>=3?t.normalizedQuery:null;return{...e,query:r,sampleCount:t?.samples??0}})}}catch(e){if(c(e))return{periodDays:t,totals:{totalSearches:0,totalClicks:0,noResultSearches:0,clickThroughRate:0,noResultRate:0},byContext:[],daily:[],topQueries:[]};throw e}}async function E(e){let t=await R(e);return{generatedAt:new Date().toISOString(),periodDays:t.periodDays,totals:t.totals,byContext:t.byContext,daily:t.daily,topQueries:t.topQueries}}async function y(e){let t=Math.min(1095,Math.max(30,Math.floor(e?.retentionDays??180))),s=e?.dryRun??!1;if(!await p())return{retentionDays:t,dryRun:s,deletedHistoryRows:0,deletedMetricRows:0};let n=new Date(Date.now()-864e5*t),i=o(n),[l]=await a.prisma.$queryRaw(r.Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "SearchHistory"
      WHERE "createdAt" < ${n}
    `),[u]=await a.prisma.$queryRaw(r.Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "SearchQueryMetric"
      WHERE "day" < ${i}
    `),c=Number(l?.count??0),d=Number(u?.count??0);return s||await a.prisma.$transaction([a.prisma.$executeRaw(r.Prisma.sql`
          DELETE FROM "SearchHistory"
          WHERE "createdAt" < ${n}
        `),a.prisma.$executeRaw(r.Prisma.sql`
          DELETE FROM "SearchQueryMetric"
          WHERE "day" < ${i}
        `)]),{retentionDays:t,dryRun:s,deletedHistoryRows:c,deletedMetricRows:d}}e.s(["cleanupSearchHistory",0,y,"getSearchAnalyticsExport",0,E,"getSearchAnalyticsSummary",0,R,"listUserSearchHistory",0,S,"recordSearchQuery",0,d,"recordSearchResultClick",0,h],129117)},298534,e=>{"use strict";var t=e.i(747909),r=e.i(174017),a=e.i(996250),s=e.i(759756),n=e.i(561916),i=e.i(174677),o=e.i(869741),l=e.i(316795),u=e.i(487718),c=e.i(995169),p=e.i(47587),d=e.i(666012),h=e.i(570101),S=e.i(626937),R=e.i(10372),E=e.i(193695);e.i(820232);var y=e.i(600220),m=e.i(89171),x=e.i(419808),C=e.i(748813),A=e.i(129117);async function T(e){try{var t,r;let a,s,n=await (0,x.requireAuth)({headers:e.headers});if(!n)return m.NextResponse.json({error:"Unauthorized"},{status:401});let i=await (0,A.listUserSearchHistory)({userId:n.user.id,cursor:(t=e.nextUrl.searchParams.get("cursor"),a=Number(t??0),Number.isFinite(a)?Math.max(0,Math.floor(a)):0),limit:(r=e.nextUrl.searchParams.get("limit"),s=Number(r??20),Number.isFinite(s)?Math.max(1,Math.min(100,Math.floor(s))):20),context:function(e){if(e&&C.SEARCH_CONTEXTS.includes(e))return e}(e.nextUrl.searchParams.get("context")),eventType:function(e){if("QUERY"===e||"CLICK"===e)return e}(e.nextUrl.searchParams.get("eventType"))});return m.NextResponse.json(i)}catch{return m.NextResponse.json({error:"Unable to read search history"},{status:500})}}e.s(["GET",0,T,"runtime",0,"nodejs"],899268);var f=e.i(899268);let M=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/profile/search/history/route",pathname:"/api/profile/search/history",filename:"route",bundlePath:""},distDir:".next-translation-build",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/profile/search/history/route.ts",nextConfigOutput:"",userland:f,...{}}),{workAsyncStorage:w,workUnitAsyncStorage:q,serverHooks:O}=M;async function $(e,t,a){a.requestMeta&&(0,s.setRequestMeta)(e,a.requestMeta),M.isDev&&(0,s.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let m="/api/profile/search/history/route";m=m.replace(/\/index$/,"")||"/";let x=await M.prepare(e,t,{srcPage:m,multiZoneDraftMode:!1});if(!x)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:C,deploymentId:A,params:T,nextConfig:f,parsedUrl:w,isDraftMode:q,prerenderManifest:O,routerServerContext:$,isOnDemandRevalidate:U,revalidateOnlyGenerated:N,resolvedPathname:g,clientReferenceManifest:v,serverActionsManifest:P}=x,H=(0,o.normalizeAppPath)(m),I=!!(O.dynamicRoutes[H]||O.routes[g]),D=async()=>((null==$?void 0:$.render404)?await $.render404(e,t,w,!1):t.end("This page could not be found"),null);if(I&&!q){let e=!!O.routes[g],t=O.dynamicRoutes[H];if(t&&!1===t.fallback&&!e){if(f.adapterPath)return await D();throw new E.NoFallbackError}}let L=null;!I||M.isDev||q||(L="/index"===(L=g)?"/":L);let b=!0===M.isDev||!I,k=I&&!b;P&&v&&(0,i.setManifestsSingleton)({page:m,clientReferenceManifest:v,serverActionsManifest:P});let _=e.method||"GET",Q=(0,n.getTracer)(),F=Q.getActiveScopeSpan(),W=!!(null==$?void 0:$.isWrappedByNextServer),j=!!(0,s.getRequestMeta)(e,"minimalMode"),Y=(0,s.getRequestMeta)(e,"incrementalCache")||await M.getIncrementalCache(e,f,O,j);null==Y||Y.resetRequestCache(),globalThis.__incrementalCache=Y;let B={params:T,previewProps:O.preview,renderOpts:{experimental:{authInterrupts:!!f.experimental.authInterrupts},cacheComponents:!!f.cacheComponents,supportsDynamicResponse:b,incrementalCache:Y,cacheLifeProfiles:f.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,s)=>M.onRequestError(e,t,a,s,$)},sharedContext:{buildId:C,deploymentId:A}},z=new l.NodeNextRequest(e),G=new l.NodeNextResponse(t),K=u.NextRequestAdapter.fromNodeNextRequest(z,(0,u.signalFromNodeResponse)(t));try{let s,i=async e=>M.handle(K,B).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=Q.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==c.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${_} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t),s&&s!==e&&(s.setAttribute("http.route",a),s.updateName(t))}else e.updateName(`${_} ${m}`)}),o=async s=>{var n,o;let l=async({previousCacheEntry:r})=>{try{if(!j&&U&&N&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await i(s);e.fetchMetrics=B.renderOpts.fetchMetrics;let o=B.renderOpts.pendingWaitUntil;o&&a.waitUntil&&(a.waitUntil(o),o=void 0);let l=B.renderOpts.collectedTags;if(!I)return await (0,d.sendResponse)(z,G,n,B.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,h.toNodeOutgoingHttpHeaders)(n.headers);l&&(t[R.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==B.renderOpts.collectedRevalidate&&!(B.renderOpts.collectedRevalidate>=R.INFINITE_CACHE)&&B.renderOpts.collectedRevalidate,a=void 0===B.renderOpts.collectedExpire||B.renderOpts.collectedExpire>=R.INFINITE_CACHE?void 0:B.renderOpts.collectedExpire;return{value:{kind:y.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await M.onRequestError(e,t,{routerKind:"App Router",routePath:m,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:k,isOnDemandRevalidate:U})},!1,$),t}},u=await M.handleResponse({req:e,nextConfig:f,cacheKey:L,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:O,isRoutePPREnabled:!1,isOnDemandRevalidate:U,revalidateOnlyGenerated:N,responseGenerator:l,waitUntil:a.waitUntil,isMinimalMode:j});if(!I)return null;if((null==u||null==(n=u.value)?void 0:n.kind)!==y.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(o=u.value)?void 0:o.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});j||t.setHeader("x-nextjs-cache",U?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),q&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let c=(0,h.fromNodeOutgoingHttpHeaders)(u.value.headers);return j&&I||c.delete(R.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||c.get("Cache-Control")||c.set("Cache-Control",(0,S.getCacheControlHeader)(u.cacheControl)),await (0,d.sendResponse)(z,G,new Response(u.value.body,{headers:c,status:u.value.status||200})),null};W&&F?await o(F):(s=Q.getActiveScopeSpan(),await Q.withPropagatedContext(e.headers,()=>Q.trace(c.BaseServerSpan.handleRequest,{spanName:`${_} ${m}`,kind:n.SpanKind.SERVER,attributes:{"http.method":_,"http.target":e.url}},o),void 0,!W))}catch(t){if(t instanceof E.NoFallbackError||await M.onRequestError(e,t,{routerKind:"App Router",routePath:H,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:k,isOnDemandRevalidate:U})},!1,$),I)throw t;return await (0,d.sendResponse)(z,G,new Response(null,{status:500})),null}}e.s(["handler",0,$,"patchFetch",0,function(){return(0,a.patchFetch)({workAsyncStorage:w,workUnitAsyncStorage:q})},"routeModule",0,M,"serverHooks",0,O,"workAsyncStorage",0,w,"workUnitAsyncStorage",0,q],298534)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__1wzgm97._.js.map