//During the test the env variable is set to test
process.env.NODE_ENV = 'test';
process.env.PORT = 5001;

//Require the dev-dependencies
const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../index');
const should = chai.should();
chai.use(chaiHttp);

describe('/GET lines', () => {
  it('It should GET all the lines', (done) => {
    chai.request(server)
      .get('/all/lines')
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('array');
        res.body.length.should.be.eql(46);
        done();
      });
  });

  it('It should GET lines that meets search query', (done) => {
    chai.request(server)
      .get('/all/lines?query=go')
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('array');
        res.body.length.should.be.eql(5);
        done();
      });
  });

  it('It should GET empty array of no lines', (done) => {
    chai.request(server)
      .get('/all/lines?query=z')
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('array');
        res.body.length.should.be.eql(0);
        done();
      });
  });

  it('It should GET lines of the given limit size', (done) => {
    chai.request(server)
      .get('/lines?limit=3')
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('array');
        res.body.length.should.be.eql(3);
        done();
      });
  });

  it('It should GET lines on the given page (with offset)', (done) => {
    chai.request(server)
      .get('/lines?page=2')
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('array');
        res.body[0].route_short_name.should.be.eql("06");
        done();
      });
  });

  it('It should GET lines with given query, page, and limit', (done) => {
    chai.request(server)
      .get('/lines?query=go&page=2&limit=2')
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('array');
        res.body[0].route_short_name.should.be.eql("40");
        done();
      });
  });
});

describe('/GET a line', () => {
  it('It should GET single lines', (done) => {
    chai.request(server)
      .get('/lines/hsr/route/4349')
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        done();
      });
  });

  it('It should not GET single line that does not exist', (done) => {
    chai.request(server)
      .get('/lines/hsr/route/999')
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.empty;
        done();
      });
  });
});

describe('/GET lines by stop', () => {
  it('It should GET lines with stop id', (done) => {
    chai.request(server)
      .get('/lines/hsr/stop/355574')
      .end((err, res) => {
        res.should.have.status(200);
        res.body.length.should.be.eql(2);
        done();
      });
  });
});
