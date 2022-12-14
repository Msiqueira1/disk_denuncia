/* module.exports = {

    database: {
        connectionLimit: 10,
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'db_links'
    }

}; */


module.exports = {

    database: {
        connectionLimit: 10,
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'diskd_prod',
        dialect: 'mysql',
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
};