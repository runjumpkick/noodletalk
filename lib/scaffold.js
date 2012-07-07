/* Generic db keys content retriever
 * Requires: db client connection, key name, channel, message limit
 * Returns: data list if found
 */
exports.getDataByKeys = function(client, keyName, channel, callback) {
  client.keys(keyName + ':' + channel + ':*', function(err, dataItems) {
    if (err) {
      return callback(err);
    }

    try {
      var dataList = [];

      if (dataItems.length > 0) {
        dataItems.forEach(function(dataItem, counter) {
          client.get(dataItem, function(errDataItem, dataHash) {
            if (errDataItem) {
              return callback(errDataItem);
            }

            dataList.unshift(JSON.parse(dataHash));

            if (counter === dataItems.length - 1) {
              return callback(null, dataList);
            }
          });
        });
      } else {
        return callback(null, dataList);
      }
    } catch (dataErr) {
      return callback(dataErr);
    }
  });
};

/* Generic db list content retriever
 * Requires: db client connection, key name, channel, message limit
 * Returns: data list if found
 */
exports.getDataByList = function(client, keyName, channel, recentLimit, callback) {
  client.lrange(keyName + ':' + channel, 0, recentLimit + 1, function(err, dataItems) {
    if (err) {
      return callback(err);
    }

    try {
      var dataList = [];

      if (dataItems.length > 0) {
        dataItems.forEach(function(dataItem, counter) {
          dataList.unshift(JSON.parse(dataItem));

          if (counter === dataItems.length - 1) {
            return callback(null, dataList);
          }
        });
      } else {
        return callback(null, dataList);
      }
    } catch (dataErr) {
      return callback(dataErr);
    }
  });
};
