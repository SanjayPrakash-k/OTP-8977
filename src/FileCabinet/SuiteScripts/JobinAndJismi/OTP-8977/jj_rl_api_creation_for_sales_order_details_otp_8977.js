/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
/*************************************************************************************
 *
 *
 * ${OTP-8977} : ${Create API for the fetching the Sales order details}
 *
 *
 **************************************************************************************
 *
 * Author: Jobin and Jismi IT Services
 *
 * Date Created : 10-June-2025
 *
 * Description : This script is for fetching sales order with open status. Details of 
 * the sales order include internal ID, document number, date, and total amount. The 
 * data should be in a JSON object. The application will use the API for fetching the 
 * sales order whose status is open. The application needs to fetch the single sales 
 * order with item details include item name, quantity, rate, gross amount). The 
 * internal id of the sales order will be passed as a parameter in the API. The 
 * application needs to use the API for fetching the single sales order. If no sales 
 * order is found for the parameter id, then the message "RESULT: NOT FOUND needs to 
 * be shown.
 *
 *
 * REVISION HISTORY
 *
 * @version 1.0  :  10-June-2025:  The initial build was created by JJ0404
 *
 *
 *
 *************************************************************************************/
define(['N/log', 'N/record', 'N/search'],
    /**
 * @param{log} log
 * @param{record} record
 * @param{search} search
 */
    (log, record, search) => {
        /**
         * Defines the function that is executed when a GET request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const get = (requestParams) => {
            if(requestParams.salesOrderId)
                return JSON.stringify(salesOrderDetails(requestParams.salesOrderId));
            else
                return JSON.stringify(searchOpenSalesOrders());
        }

        /**
         * Defines the function that is executed when a PUT request is sent to a RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body are passed as a string when request
         *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
         *     the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const put = (requestBody) => {
            return JSON.stringify(updateFulfillmentRecord(requestBody.recordToUpdate));
        }

        /**
         * Defines the function that is executed when a POST request is sent to a RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body is passed as a string when request
         *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
         *     the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const post = (requestBody) => {
            return JSON.stringify(transformSalesOrder(requestBody.salesOrderId));
        }

        /**
         * Defines the function that is executed when a DELETE request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters are passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const doDelete = (requestParams) => {
            return JSON.stringify(deleteFulfillmentRecord(requestParams.recordIdToDelete));
        }

        /**
        * Function to create search for fetching sales order details
        * @returns {object} 
        */
        function searchOpenSalesOrders(){
            try{
                let openSalesOrderSearch = search.create({
                    title: 'Sales Order with Open Status JJ',
                    id: 'customsearch_jj_sales_order_with_open_st',
                    type: 'salesorder',

                    filters:
                    [
                        ["type","anyof","SalesOrd"], 
                        "AND", 
                        ["status","anyof","SalesOrd:B","SalesOrd:D","SalesOrd:E","SalesOrd:F"], 
                        "AND", 
                        ["mainline","is","T"]
                    ],

                    columns: 
                    [
                        { name: 'internalid' },
                        { name: 'tranid' },
                        { name: 'trandate' },
                        { name: 'grossamount' }
                    ]
                });

                let searchResult = openSalesOrderSearch.run().getRange({ start: 0, end: 400 });
                let salesOrderDetails = searchResult.map(result => ({
                    internalId: result.getValue({name: 'internalid'}),
                    documentNumber: result.getValue({name: 'tranid'}),
                    date: result.getValue({name: 'trandate'}),
                    netAmount: result.getValue({name: 'grossamount'})
                }));

                return {
                    status: 'Success',
                    message: 'Successfully fetched Sales Order Details',
                    value: salesOrderDetails
                };

            } catch(error) {
                log.error('Unexpected error occured while running the search', error.toString());
            }
        }

        /**
        * Function to check sales order and return the details or necessary message
        * @params {integer} salesOrderId - Sales Order Id
        * @returns {object} 
        */
        function salesOrderDetails(salesOrderId){
            try{
                let salesRecord = record.load({
                    type: record.Type.SALES_ORDER,
                    id: salesOrderId
                });

                let itemDetails = [];
                let lineCount = salesRecord.getLineCount({sublistId: 'item'});
                for(let i = 0; i < lineCount; i++){
                    let item = salesRecord.getSublistText({ sublistId: 'item', fieldId: 'item', line: i });
                    let quantity = salesRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                    let rate = salesRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i });
                    let grossAmount = salesRecord.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i });

                    itemDetails.push({
                        item: item,
                        quantity: quantity,
                        rate: rate,
                        grossAmount: grossAmount
                    });
                }

                return {
                    status: 'Success',
                    message: `Successfully fetched details of Sales Order - ${salesOrderId}`,
                    itemDetails: itemDetails
                };

            } catch(error) {
                if(error.name === 'RCRD_DSNT_EXIST' || 'INVALID_TRANS_TYP')
                    return 'RESULT: SALES ORDER DOES NOT EXIST';
                else
                    log.error('Unexpected error occured while loading sales record', error.toString());
            }
        }

        /**
        * Function to transform Sales Order Record to Item Fulfillment Record
        * @params {integer} transformId - Sales Order Id that need to be transformed
        * @returns {object} 
        */
        function transformSalesOrder(transformId){
            try{
                let recordToTransform = record.transform({
                    fromType: 'salesorder',
                    fromId: transformId,
                    toType: 'itemfulfillment',
                    isDynamic: true
                });

                let transformedRecordId = recordToTransform.save();

                return {
                    status: 'Successfully Transformed',
                    message: `Sales Order ${transformId} has been successfully transformed to item fulfillment record ${transformedRecordId}`
                }
            } catch(error) {
                if(error.name === 'INVALID_NUMBER'){
                    return {
                        Error: 'Invalid Sales Order ID. Internal ID only contain integers'
                    }

                } else if(error.name === 'INVALID_INITIALIZE_REF') {
                    return {
                        Not_Found: `Sales order ${transformId} does not exist`
                    }

                } else if(error.name === 'VALID_LINE_ITEM_REQD') {
                    return {
                        Unavailable: 'Item quantity is not sufficient for fulfilling'
                    }

                } else {
                    log.error('Unexpected error occured while transformin Sales Order Record', error.toString());
                }
            }
        }

        /**
        * Function to Check and delete the Item Fulfillment record
        * @params {integer} recordIdToDelete - Item Fulfillment Id that need to be deleted
        * @returns {object} 
        */
        function deleteFulfillmentRecord(recordIdToDelete){
            try{
                let itemFulfillmentRecord = record.delete({
                    type: 'itemfulfillment',
                    id: recordIdToDelete
                });

                return {
                    status: 'Successfully Deleted Record',
                    message: `Item fulfillment record, ${itemFulfillmentRecord} has been deleted`
                };

            } catch(error) {
                if(error.name === 'RCRD_DSNT_EXIST'){
                    return {
                        Not_Found: `Item fulfillment record, ${recordIdToDelete} does not exist`
                    }

                } else if(error.name === 'UNEXPECTED_ERROR') {
                    return {
                        error: 'Unexpected Error Occured'
                    }

                } else {
                    log.error('Unexpected error occured while deleting the record', error.toString());
                }
            }
        }

        /**
        * Function to update to fulfillment record
        * @params {integer} recordToUpdate - Item Fulfillment Id that need to be updated
        * @returns {object} 
        */
        function updateFulfillmentRecord(recordToUpdate){
            try{
                var customerToUpdate = record.submitFields({
                    type: record.Type.ITEM_FULFILLMENT,
                    id: recordToUpdate.id,
                    values: { memo: recordToUpdate.memo },
                    options: { enableSourcing: true, ignoreMandatoryField: true },
                });

                return {
                    status: "successfully Updated",
                    message: `Updated fulfillment record ${customerToUpdate} successfully`
                }

            } catch(error) {
                if(error.name === 'INVALID_TRANS_TYP'){
                    return {
                        Not_Found: `Item fulfillment record, ${recordToUpdate.id} does not exist`
                    }
                }
                log.error('Unexpected error occured while updating the record', error.toString());
            }
        }

        return {get, put, post, delete: doDelete}
    });
