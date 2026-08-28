self.__BUILD_MANIFEST = {
  "__rewrites": {
    "afterFiles": [],
    "beforeFiles": [
      {
        "source": "/courses/:slug((?!(?:a1|a2|b1|b2|c1|c2)$)[^/]+)",
        "destination": "/course-detail/:slug"
      },
      {
        "source": "/pricing",
        "destination": "/pricing-detail"
      }
    ],
    "fallback": []
  },
  "sortedPages": [
    "/_app",
    "/_error"
  ]
};self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()