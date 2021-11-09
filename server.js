const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const knex = require('knex');


const app = express();

app.use(express.json());
app.use(cors());

let database = {
	cards: [
	{
		titulo: 'Carta1',
		cont: 'Comprar: leche, harina, huevos...'
	},
	{
		titulo: 'Carta2',
		cont: 'Libros apra leer, harry potter, dune, etc'
	}
	]
}

const db = knex({
	client: 'pg',
  	connection: {
	    host : 'localhost',
	    port : 5432,
	    user : 'postgres',
	    password : 'bondiolita123',
	    database : 'placeholder'
	}
})


app.get('/', (req, res)=> {
	res.json('Connected to the server')
});

app.post('/cards', (req, res) => {
	const { id } = req.body;
	db.select('card', 'title', 'entry')
	.from('cards')
	.where('id', '=', id)
	.then(cards => {
		return res.json(cards);
	})
});

app.post('/create-card', (req, res) => {
	const { newCard, id } = req.body;
	if (!id || !newCard) {
		return res.status(400).json('Error creating note')
	}
	db('users').where('id', '=', id).increment('entries', 1).returning('entries')
	.then(entries => {
		db.insert({
			id: id,
			title: newCard.titulo,
			card: newCard.cont,
			entry: entries[0]
		})
		.into('cards')
		.then(res.json('new card created'))
		.catch(err => res.status(400).json('An error has ocurred'))
	})
	.catch(err => res.status(400).json('An error has ocurred'))
	
	// Chequear si useEffect actualiza automaticamente el componente o tenes que devoler el array cartas por aca
})

app.post('/signin', (req, res) => {
	const { email, password } = req.body;
	if (!email || !password) {
		return res.status(400).json('Incorrect credentials')
	}
	db.select('email', 'hash').from('login')
	.where('email', '=', req.body.email)
	.then(data => {
		console.log(data);
		const isValid = bcrypt.compareSync(password, data[0].hash);
		if (isValid) {
			return db.select('*').from('users').where('email', '=', email)
			.then(user=> {
				res.json(user[0])
			})
			.catch(err => res.status(400).json('Unable to get user'))
		} else {
			res.status(400).json('Wrong credentials(password)')
		}
	})
	.catch(err => res.status(400).json('Wrong credentials(complete error)'))

})

app.post('/register', (req, res) => {
	const { email, name, password } = req.body;
	if (!email || !name || !password) {
		res.status(400).json('incorrect form submission')
	}
	const hash = bcrypt.hashSync(password);
	db.transaction(trx => {
		trx.insert({
			hash: hash,
			email: email
		})
		.into('login')
		.returning('email')
		.then(loginEmail => {
			return trx('users')
				.returning('*')
				.insert({
					email: loginEmail[0],
					name: name,
					joined: new Date()
				})
				.then(user => {
					res.json(user[0])
				})
		})
		.then(trx.commit)
		.catch(trx.rollback)
	})
	.catch(err => res.status(400).json('Unable to register'))
})

app.post('/delete-card', (req, res) => {
	const { id, entry } = req.body;
	if (!id || !entry) {
		res.status(400).json('Error deleting card');
	}
	db('cards')
	.where('id', '=', id)
	.andWhere('entry', '=', entry)
	.del()
	.then(res.json('card deleted succesfully'))
	.catch(err => res.status(400).json('An error has ocurred'))
}) 

// / -> server working
// /cards -> POST = res(array of cards)
// /create-card -> POST = succes/fail
// /signin -> POST = succes/fail
// /register -> POST = user

app.listen(process.env.PORT || 3001, () => {
	console.log('Server running on port', process.env.PORT, '(default 3001)');
})