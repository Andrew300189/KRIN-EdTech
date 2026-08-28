module.exports=[427699,(e,t,r)=>{t.exports=e.x("events",()=>require("events"))},446786,(e,t,r)=>{t.exports=e.x("os",()=>require("os"))},870722,(e,t,r)=>{t.exports=e.x("tty",()=>require("tty"))},522734,(e,t,r)=>{t.exports=e.x("fs",()=>require("fs"))},233405,(e,t,r)=>{t.exports=e.x("child_process",()=>require("child_process"))},924868,(e,t,r)=>{t.exports=e.x("fs/promises",()=>require("fs/promises"))},410430,(e,t,r)=>{t.exports=e.x("async_hooks",()=>require("async_hooks"))},254799,(e,t,r)=>{t.exports=e.x("crypto",()=>require("crypto"))},921517,(e,t,r)=>{t.exports=e.x("http",()=>require("http"))},524836,(e,t,r)=>{t.exports=e.x("https",()=>require("https"))},500874,(e,t,r)=>{t.exports=e.x("buffer",()=>require("buffer"))},406461,(e,t,r)=>{t.exports=e.x("zlib",()=>require("zlib"))},193695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},918622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},556704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},832319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},324725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},814747,(e,t,r)=>{t.exports=e.x("path",()=>require("path"))},224361,(e,t,r)=>{t.exports=e.x("util",()=>require("util"))},270406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},296638,e=>{"use strict";function t(e){return e?.trim().toLowerCase()??""}e.s(["isPlatformOwner",0,function(e){let r=t(process.env.PLATFORM_OWNER_EMAIL);return!!r&&t(e)===r},"normalizeEmail",0,t])},163460,e=>{"use strict";e.s(["hasAnyRole",0,function(e,t){let r={student:0,teacher:1,content_manager:2,admin:3,super_admin:4};return t.some(t=>r[e]>=r[t])},"parseRole",0,function(e){let t=(e??"").toLowerCase();return"super_admin"===t?"super_admin":"admin"===t?"admin":"content_manager"===t?"content_manager":"teacher"===t||"instructor"===t?"teacher":"student"}])},138033,e=>{"use strict";e.s(["logAuthDiagnostic",0,function(e){}])},62195,e=>{"use strict";var t=e.i(138033),r=e.i(296638),a=e.i(419808),s=e.i(163460);async function n(e){let n=await (0,a.requireAuth)({headers:e?.headers});return n?(0,r.isPlatformOwner)(n.user.email)?((0,t.logAuthDiagnostic)({event:"cms_guard_result",result:"allowed"}),{ok:!0,user:n.user,role:(0,s.parseRole)(n.user.role)}):((0,t.logAuthDiagnostic)({event:"cms_guard_result",result:"forbidden"}),{ok:!1,status:403,error:"Forbidden"}):((0,t.logAuthDiagnostic)({event:"cms_guard_result",result:"unauthorized"}),{ok:!1,status:401,error:"Unauthorized"})}e.s(["requirePlatformOwner",0,n])},129117,748813,417726,e=>{"use strict";var t=e.i(254799),r=e.i(904528),a=e.i(160939);function s(e){return e.normalize("NFKC").replace(/\s+/g," ").trim().slice(0,150)}e.s(["DEFAULT_TOTAL_LIMIT",0,20,"MAX_QUERY_LENGTH",0,150,"MIN_QUERY_LENGTH",0,2,"SEARCH_CONTEXTS",0,["PUBLIC","STUDENT","TEACHER","ADMIN"],"SEARCH_RESULT_TYPES",0,["COURSE","CATEGORY","ACADEMY","LESSON","GRAMMAR_TOPIC","VOCABULARY_TOPIC","HELP_ARTICLE","ASSIGNMENT","GROUP","STUDENT","SUBMISSION","USER_WORD","USER_MISTAKE","ACHIEVEMENT"]],748813),e.s(["normalizeSearchQuery",0,s],417726);let n=null;function o(e){return(0,t.createHash)("sha256").update(e).digest("hex")}function i(e=new Date){return new Date(Date.UTC(e.getUTCFullYear(),e.getUTCMonth(),e.getUTCDate()))}function l(e){return e.toUpperCase()}function u(e){return s(e).toLocaleLowerCase("en")}function c(e){return e instanceof r.Prisma.PrismaClientKnownRequestError&&"P2010"===e.code&&"42P01"===("string"==typeof e.meta?.code?e.meta.code:"")}async function d(){return n||(n=a.prisma.$queryRaw(r.Prisma.sql`
        SELECT
          to_regclass('"SearchHistory"')::text AS "historyTable",
          to_regclass('"SearchQueryMetric"')::text AS "metricTable"
      `).then(e=>!!(e[0]?.historyTable&&e[0]?.metricTable)).catch(()=>!1)),n}async function p(e){if(!await d())return;let s=u(e.query);if(!s)return;let n=o(s),p=l(e.context),h=i();await a.prisma.$transaction([a.prisma.$executeRaw(r.Prisma.sql`
        INSERT INTO "SearchHistory" (
          "id", "userId", "eventType", "query", "normalizedQuery", "queryHash", "context",
          "resultCount", "tookMs", "locale", "ipHash", "userAgent", "createdAt"
        )
        VALUES (
          ${(0,t.randomUUID)()}, ${e.userId??null}, 'QUERY', ${e.query}, ${s}, ${n}, ${p},
          ${Math.max(0,Math.floor(e.resultCount))}, ${Math.max(0,Math.floor(e.tookMs))}, ${e.locale??null},
          ${e.ip?o(e.ip):null}, ${e.userAgent?.slice(0,512)??null}, NOW()
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
      `)]).catch(e=>{if(!c(e))throw e})}async function h(e){if(!await d())return;let s=u(e.query);if(!s)return;let n=o(s),p=l(e.context),h=i();await a.prisma.$transaction([a.prisma.$executeRaw(r.Prisma.sql`
        INSERT INTO "SearchHistory" (
          "id", "userId", "eventType", "query", "normalizedQuery", "queryHash", "context",
          "resultType", "resultId", "resultUrl", "position", "locale", "ipHash", "userAgent", "createdAt"
        )
        VALUES (
          ${(0,t.randomUUID)()}, ${e.userId??null}, 'CLICK', ${e.query}, ${s}, ${n}, ${p},
          ${e.resultType}, ${e.resultId.slice(0,191)}, ${e.resultUrl.slice(0,512)}, ${Math.max(0,Math.floor(e.position))},
          ${e.locale??null}, ${e.ip?o(e.ip):null}, ${e.userAgent?.slice(0,512)??null}, NOW()
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
      `)]).catch(e=>{if(!c(e))throw e})}async function R(e){let t=Math.max(0,Math.floor(e.cursor??0)),s=Math.min(100,Math.max(1,Math.floor(e.limit??20)));if(!await d())return{items:[],total:0,cursor:t,nextCursor:null};try{let n=[r.Prisma.sql`"userId" = ${e.userId}`];e.context&&n.push(r.Prisma.sql`"context" = ${l(e.context)}`),e.eventType&&n.push(r.Prisma.sql`"eventType" = ${e.eventType}`);let o=r.Prisma.sql`WHERE ${r.Prisma.join(n," AND ")}`,[i]=await a.prisma.$queryRaw(r.Prisma.sql`
        SELECT COUNT(*)::int AS count
        FROM "SearchHistory"
        ${o}
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
        ${o}
        ORDER BY "createdAt" DESC
        LIMIT ${s}
        OFFSET ${t}
      `),c=Number(i?.count??0);return{items:u,total:c,cursor:t,nextCursor:t+s<c?t+s:null}}catch(e){if(c(e))return{items:[],total:0,cursor:t,nextCursor:null};throw e}}async function m(e){let t=Math.min(365,Math.max(1,Math.floor(e?.days??30)));if(!await d())return{periodDays:t,totals:{totalSearches:0,totalClicks:0,noResultSearches:0,clickThroughRate:0,noResultRate:0},byContext:[],daily:[],topQueries:[]};let s=i(new Date(Date.now()-(t-1)*864e5)),n=e?.context?l(e.context):null,o=n?r.Prisma.sql`AND "context" = ${n}`:r.Prisma.empty,u=n?r.Prisma.sql`AND "context" = ${n}`:r.Prisma.empty;try{let[e]=await a.prisma.$queryRaw(r.Prisma.sql`
      SELECT
        COALESCE(SUM("totalSearches"), 0)::int AS "totalSearches",
        COALESCE(SUM("noResultSearches"), 0)::int AS "noResultSearches",
        COALESCE(SUM("totalClicks"), 0)::int AS "totalClicks"
      FROM "SearchQueryMetric"
      WHERE "day" >= ${s}
      ${o}
    `),n=await a.prisma.$queryRaw(r.Prisma.sql`
      SELECT
        "context",
        COALESCE(SUM("totalSearches"), 0)::int AS "totalSearches",
        COALESCE(SUM("noResultSearches"), 0)::int AS "noResultSearches",
        COALESCE(SUM("totalClicks"), 0)::int AS "totalClicks"
      FROM "SearchQueryMetric"
      WHERE "day" >= ${s}
      ${o}
      GROUP BY "context"
      ORDER BY "totalSearches" DESC
    `),i=await a.prisma.$queryRaw(r.Prisma.sql`
      SELECT
        "day",
        COALESCE(SUM("totalSearches"), 0)::int AS "totalSearches",
        COALESCE(SUM("totalClicks"), 0)::int AS "totalClicks",
        COALESCE(SUM("noResultSearches"), 0)::int AS "noResultSearches"
      FROM "SearchQueryMetric"
      WHERE "day" >= ${s}
      ${o}
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
      ${o}
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
      `),d=new Map;for(let e of c){let t=d.get(e.queryHash);(!t||e.samples>t.samples)&&d.set(e.queryHash,{normalizedQuery:e.normalizedQuery,samples:e.samples})}let p=Number(e?.totalSearches??0),h=Number(e?.totalClicks??0),R=Number(e?.noResultSearches??0);return{periodDays:t,totals:{totalSearches:p,totalClicks:h,noResultSearches:R,clickThroughRate:p?Math.round(h/p*1e3)/10:0,noResultRate:p?Math.round(R/p*1e3)/10:0},byContext:n.map(e=>({...e,clickThroughRate:e.totalSearches?Math.round(e.totalClicks/e.totalSearches*1e3)/10:0,noResultRate:e.totalSearches?Math.round(e.noResultSearches/e.totalSearches*1e3)/10:0})),daily:i,topQueries:l.map(e=>{let t=d.get(e.queryHash),r=t&&t.samples>=3?t.normalizedQuery:null;return{...e,query:r,sampleCount:t?.samples??0}})}}catch(e){if(c(e))return{periodDays:t,totals:{totalSearches:0,totalClicks:0,noResultSearches:0,clickThroughRate:0,noResultRate:0},byContext:[],daily:[],topQueries:[]};throw e}}async function S(e){let t=await m(e);return{generatedAt:new Date().toISOString(),periodDays:t.periodDays,totals:t.totals,byContext:t.byContext,daily:t.daily,topQueries:t.topQueries}}async function y(e){let t=Math.min(1095,Math.max(30,Math.floor(e?.retentionDays??180))),s=e?.dryRun??!1;if(!await d())return{retentionDays:t,dryRun:s,deletedHistoryRows:0,deletedMetricRows:0};let n=new Date(Date.now()-864e5*t),o=i(n),[l]=await a.prisma.$queryRaw(r.Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "SearchHistory"
      WHERE "createdAt" < ${n}
    `),[u]=await a.prisma.$queryRaw(r.Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "SearchQueryMetric"
      WHERE "day" < ${o}
    `),c=Number(l?.count??0),p=Number(u?.count??0);return s||await a.prisma.$transaction([a.prisma.$executeRaw(r.Prisma.sql`
          DELETE FROM "SearchHistory"
          WHERE "createdAt" < ${n}
        `),a.prisma.$executeRaw(r.Prisma.sql`
          DELETE FROM "SearchQueryMetric"
          WHERE "day" < ${o}
        `)]),{retentionDays:t,dryRun:s,deletedHistoryRows:c,deletedMetricRows:p}}e.s(["cleanupSearchHistory",0,y,"getSearchAnalyticsExport",0,S,"getSearchAnalyticsSummary",0,m,"listUserSearchHistory",0,R,"recordSearchQuery",0,p,"recordSearchResultClick",0,h],129117)},428424,e=>{"use strict";var t=e.i(747909),r=e.i(174017),a=e.i(996250),s=e.i(759756),n=e.i(561916),o=e.i(174677),i=e.i(869741),l=e.i(316795),u=e.i(487718),c=e.i(995169),d=e.i(47587),p=e.i(666012),h=e.i(570101),R=e.i(626937),m=e.i(10372),S=e.i(193695);e.i(820232);var y=e.i(600220),E=e.i(89171),C=e.i(322632),x=e.i(62195),A=e.i(129117);let f=C.z.object({retentionDays:C.z.number().int().min(30).max(1095).optional(),dryRun:C.z.boolean().optional()});async function w(e){try{let t=await (0,x.requirePlatformOwner)(e);if(!t.ok)return E.NextResponse.json({error:t.error},{status:t.status});let r=await e.json().catch(()=>({})),a=f.safeParse(r);if(!a.success)return E.NextResponse.json({error:"Invalid payload"},{status:400});let s=await (0,A.cleanupSearchHistory)(a.data);return E.NextResponse.json({data:s})}catch{return E.NextResponse.json({error:"Unable to cleanup search analytics"},{status:500})}}e.s(["POST",0,w,"runtime",0,"nodejs"],90416);var T=e.i(90416);let M=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/admin/analytics/search/cleanup/route",pathname:"/api/admin/analytics/search/cleanup",filename:"route",bundlePath:""},distDir:".next-translation-build",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/admin/analytics/search/cleanup/route.ts",nextConfigOutput:"",userland:T,...{}}),{workAsyncStorage:O,workUnitAsyncStorage:q,serverHooks:$}=M;async function g(e,t,a){a.requestMeta&&(0,s.setRequestMeta)(e,a.requestMeta),M.isDev&&(0,s.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let E="/api/admin/analytics/search/cleanup/route";E=E.replace(/\/index$/,"")||"/";let C=await M.prepare(e,t,{srcPage:E,multiZoneDraftMode:!1});if(!C)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:x,deploymentId:A,params:f,nextConfig:w,parsedUrl:T,isDraftMode:O,prerenderManifest:q,routerServerContext:$,isOnDemandRevalidate:g,revalidateOnlyGenerated:N,resolvedPathname:U,clientReferenceManifest:v,serverActionsManifest:P}=C,D=(0,i.normalizeAppPath)(E),H=!!(q.dynamicRoutes[D]||q.routes[U]),I=async()=>((null==$?void 0:$.render404)?await $.render404(e,t,T,!1):t.end("This page could not be found"),null);if(H&&!O){let e=!!q.routes[U],t=q.dynamicRoutes[D];if(t&&!1===t.fallback&&!e){if(w.adapterPath)return await I();throw new S.NoFallbackError}}let _=null;!H||M.isDev||O||(_="/index"===(_=U)?"/":_);let b=!0===M.isDev||!H,L=H&&!b;P&&v&&(0,o.setManifestsSingleton)({page:E,clientReferenceManifest:v,serverActionsManifest:P});let k=e.method||"GET",Q=(0,n.getTracer)(),F=Q.getActiveScopeSpan(),j=!!(null==$?void 0:$.isWrappedByNextServer),W=!!(0,s.getRequestMeta)(e,"minimalMode"),z=(0,s.getRequestMeta)(e,"incrementalCache")||await M.getIncrementalCache(e,w,q,W);null==z||z.resetRequestCache(),globalThis.__incrementalCache=z;let B={params:f,previewProps:q.preview,renderOpts:{experimental:{authInterrupts:!!w.experimental.authInterrupts},cacheComponents:!!w.cacheComponents,supportsDynamicResponse:b,incrementalCache:z,cacheLifeProfiles:w.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,s)=>M.onRequestError(e,t,a,s,$)},sharedContext:{buildId:x,deploymentId:A}},Y=new l.NodeNextRequest(e),G=new l.NodeNextResponse(t),K=u.NextRequestAdapter.fromNodeNextRequest(Y,(0,u.signalFromNodeResponse)(t));try{let s,o=async e=>M.handle(K,B).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=Q.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==c.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${k} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t),s&&s!==e&&(s.setAttribute("http.route",a),s.updateName(t))}else e.updateName(`${k} ${E}`)}),i=async s=>{var n,i;let l=async({previousCacheEntry:r})=>{try{if(!W&&g&&N&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await o(s);e.fetchMetrics=B.renderOpts.fetchMetrics;let i=B.renderOpts.pendingWaitUntil;i&&a.waitUntil&&(a.waitUntil(i),i=void 0);let l=B.renderOpts.collectedTags;if(!H)return await (0,p.sendResponse)(Y,G,n,B.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,h.toNodeOutgoingHttpHeaders)(n.headers);l&&(t[m.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==B.renderOpts.collectedRevalidate&&!(B.renderOpts.collectedRevalidate>=m.INFINITE_CACHE)&&B.renderOpts.collectedRevalidate,a=void 0===B.renderOpts.collectedExpire||B.renderOpts.collectedExpire>=m.INFINITE_CACHE?void 0:B.renderOpts.collectedExpire;return{value:{kind:y.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await M.onRequestError(e,t,{routerKind:"App Router",routePath:E,routeType:"route",revalidateReason:(0,d.getRevalidateReason)({isStaticGeneration:L,isOnDemandRevalidate:g})},!1,$),t}},u=await M.handleResponse({req:e,nextConfig:w,cacheKey:_,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:q,isRoutePPREnabled:!1,isOnDemandRevalidate:g,revalidateOnlyGenerated:N,responseGenerator:l,waitUntil:a.waitUntil,isMinimalMode:W});if(!H)return null;if((null==u||null==(n=u.value)?void 0:n.kind)!==y.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(i=u.value)?void 0:i.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});W||t.setHeader("x-nextjs-cache",g?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),O&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let c=(0,h.fromNodeOutgoingHttpHeaders)(u.value.headers);return W&&H||c.delete(m.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||c.get("Cache-Control")||c.set("Cache-Control",(0,R.getCacheControlHeader)(u.cacheControl)),await (0,p.sendResponse)(Y,G,new Response(u.value.body,{headers:c,status:u.value.status||200})),null};j&&F?await i(F):(s=Q.getActiveScopeSpan(),await Q.withPropagatedContext(e.headers,()=>Q.trace(c.BaseServerSpan.handleRequest,{spanName:`${k} ${E}`,kind:n.SpanKind.SERVER,attributes:{"http.method":k,"http.target":e.url}},i),void 0,!j))}catch(t){if(t instanceof S.NoFallbackError||await M.onRequestError(e,t,{routerKind:"App Router",routePath:D,routeType:"route",revalidateReason:(0,d.getRevalidateReason)({isStaticGeneration:L,isOnDemandRevalidate:g})},!1,$),H)throw t;return await (0,p.sendResponse)(Y,G,new Response(null,{status:500})),null}}e.s(["handler",0,g,"patchFetch",0,function(){return(0,a.patchFetch)({workAsyncStorage:O,workUnitAsyncStorage:q})},"routeModule",0,M,"serverHooks",0,$,"workAsyncStorage",0,O,"workUnitAsyncStorage",0,q],428424)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0068inq._.js.map