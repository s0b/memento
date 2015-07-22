var DOCLIST_SCOPE = 'https://docs.google.com/feeds/';
var DOCLIST_FEED = DOCLIST_SCOPE + 'default/private/full/';
var doc = null;
var docs = [];
var folder = 'Memento notes';
var folderId = null;
var defaultDocTitle = 'Memento';
var defaultEditorSize = 'medium';

var editorSizes = {
    'small': {
        'width': '320',
        'height': '240'
    },
    'medium': {
        'width': '480',
        'height': '320'
    },
    'big': {
        'width': '640',
        'height': '480'
    }
};

var oauth = ChromeExOAuth.initBackgroundPage({
    'request_url': 'https://www.google.com/accounts/OAuthGetRequestToken',
    'authorize_url': 'https://www.google.com/accounts/OAuthAuthorizeToken',
    'access_url': 'https://www.google.com/accounts/OAuthGetAccessToken',
    'consumer_key': 'anonymous',
    'consumer_secret': 'anonymous',
    'scope': DOCLIST_SCOPE,
    'app_name': 'Memento'
});
